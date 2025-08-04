from fastapi import FastAPI, UploadFile, File, Form, APIRouter
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from uuid import uuid4
from datetime import datetime
import json
from utils.conversion import process_upload
from models.study import StudyMetadata, save_metadata, load_all_metadata
import os
from pydicom import dcmread
from fastapi.responses import StreamingResponse
from io import BytesIO


app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
METADATA_FILE = "metadata.json"

os.makedirs(UPLOAD_DIR, exist_ok=True)

# Mount static directories
app.mount("/dicom", StaticFiles(directory=UPLOAD_DIR), name="dicom")
from starlette.responses import RedirectResponse

@app.get("/dicomweb/studies/{study_uid}/series/{series_uid}/instances/{instance_uid}/frames/1")
def get_frame(study_uid: str, series_uid: str, instance_uid: str):
    studies = load_all_metadata()
    study_id = next((s["study_id"] for s in studies if s["study_uid"] == study_uid), None)
    if not study_id:
        raise HTTPException(status_code=404, detail="Study not found")

    dicom_dir = os.path.join(UPLOAD_DIR, study_id, "dicom_series")

    for file in os.listdir(dicom_dir):
        file_path = os.path.join(dicom_dir, file)
        try:
            ds = dcmread(file_path)
            if ds.SOPInstanceUID == instance_uid:
                # Return pixel data (1st frame)
                pixel_data = ds.PixelData
                return StreamingResponse(BytesIO(pixel_data), media_type="application/octet-stream")
        except Exception:
            continue

    raise HTTPException(status_code=404, detail="DICOM instance not found")


@app.get("/segmentation/{study_id}/")
def get_segmentation_file(study_id: str, filename: str):
    seg_path = os.path.join(UPLOAD_DIR, study_id, "segmentation.dcm")
    if not os.path.exists(seg_path):
        raise HTTPException(status_code=404, detail="SEG file not found")
    return FileResponse(seg_path, media_type="application/dicom")


@app.get("/dicom/{study_id}/{filename}")
def get_dicom_file(study_id: str, filename: str):
    file_path = UPLOAD_DIR / study_id / "dicom_series" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="DICOM file not found")
    return FileResponse(file_path, media_type="application/dicom")

# DICOM Web router
dicomweb_router = APIRouter(prefix="/dicom")

@app.post("/upload")
async def upload_files(
    image_file: UploadFile = File(...),
    mask_file: UploadFile = File(...),
    radiography_type: str = Form(...),
):
    try:
        study_id = str(uuid4())
        study_path = os.path.join(UPLOAD_DIR, study_id)
        os.makedirs(study_path, exist_ok=True)

        image_path = os.path.join(study_path, image_file.filename)
        mask_path = os.path.join(study_path, mask_file.filename)

        with open(image_path, "wb") as f:
            f.write(await image_file.read())

        with open(mask_path, "wb") as f:
            f.write(await mask_file.read())

        study_uid, segmentation_classes = process_upload(
            study_id, image_path, mask_path
        )

        metadata = StudyMetadata(
            study_id=study_id,
            study_uid=study_uid,
            radiography_type=radiography_type,
            segmentation_classes=segmentation_classes,
        )
        save_metadata(metadata)

        return JSONResponse(
            content={
                "message": "Upload successful",
                "study_id": study_id,
                "study_uid": study_uid,
                "segmentation_classes": segmentation_classes,
            }
        )

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Upload failed: {str(e)}"})

@app.get("/studies")
def get_studies():
    studies = load_all_metadata()
    result = []
    for study in studies:
        try:
            dt = datetime.fromisoformat(study["study_datetime"])
        except:
            dt = datetime.now()

        result.append({
            "0020000D": {"vr": "UI", "Value": [study["study_uid"]]},
            "00080020": {"vr": "DA", "Value": [dt.strftime("%Y%m%d")]},
            "00080030": {"vr": "TM", "Value": [dt.strftime("%H%M%S")]},
            "00100010": {"vr": "PN", "Value": [{"Alphabetic": "Anonymous"}]},
            "00100020": {"vr": "LO", "Value": [study["study_uid"]]},
            "00080060": {"vr": "CS", "Value": ["MR"]},
            "00081030": {"vr": "LO", "Value": [study.get("radiography_type", "CBCT")]},
        })
    return JSONResponse(content=result)

@app.get("/studies/{study_uid}/series")
def get_series(study_uid: str):
    return JSONResponse(content=[{
        "0020000D": {"vr": "UI", "Value": [study_uid]},
        "0020000E": {"vr": "UI", "Value": [f"{study_uid}.1"]},
        "00200011": {"vr": "IS", "Value": [1]},
        "00080060": {"vr": "CS", "Value": ["MR"]},
        "0008103E": {"vr": "LO", "Value": ["Segmented Radiograph"]},
        "00080021": {"vr": "DA", "Value": ["20250801"]},
        "00080031": {"vr": "TM", "Value": ["153000"]},
    }])

@app.get("/studies/{study_uid}/series/{series_uid}/metadata")
def get_instance_metadata(study_uid: str, series_uid: str):
    studies = load_all_metadata()
    study_id = next((s["study_id"] for s in studies if s["study_uid"] == study_uid), None)

    if not study_id:
        return JSONResponse(status_code=404, content={"error": "Study not found"})

    dicom_path = os.path.join(UPLOAD_DIR, study_id, "dicom_series")
    files = sorted([f for f in os.listdir(dicom_path) if f.endswith(".dcm")])

    metadata = []
    for file in files:
        file_path = os.path.join(dicom_path, file)
        ds = dcmread(file_path, stop_before_pixels=True)

        instance = {
            "00080018": {"Value": [ds.SOPInstanceUID]},  # SOPInstanceUID
            "0020000D": {"Value": [ds.StudyInstanceUID]},  # StudyInstanceUID
            "0020000E": {"Value": [ds.SeriesInstanceUID]},  # SeriesInstanceUID
            "00081190": {"Value": [f"http://localhost:9999/dicom/{study_id}/dicom_series/{file}"]},
            # You can include more fields like InstanceNumber, ImagePositionPatient, etc., if needed
        }

        # Optional: Include Instance Number
        if "00200013" in ds:
            instance["00200013"] = {"Value": [int(ds.InstanceNumber)]}

        metadata.append(instance)

    return JSONResponse(content=metadata)

@dicomweb_router.get("/studies/{study_uid}/series")
def dicomweb_get_series(study_uid: str):
    return get_series(study_uid)

@dicomweb_router.get("/studies/{study_uid}/series/{series_uid}/metadata")
def dicomweb_get_instance_metadata(study_uid: str, series_uid: str):
    return get_instance_metadata(study_uid, series_uid)

@dicomweb_router.get("/{study_id}/dicom_series/{file_name}")
def serve_dicom_file(study_id: str, file_name: str):
    file_path = os.path.join(UPLOAD_DIR, study_id, "dicom_series", file_name)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="application/dicom")
    return JSONResponse(status_code=404, content={"error": "File not found"})

@dicomweb_router.get("/studies/{study_uid}/series/{series_uid}/instances")
async def get_instances(study_uid: str, series_uid: str):
    

    for study in load_all_metadata():
        if study["study_uid"] == study_uid:
            study_id = study["study_id"]
            dicom_dir = f"uploads/{study_id}/dicom_series"
            if not os.path.exists(dicom_dir):
                continue

            instances = []
            for file in sorted(os.listdir(dicom_dir)):
                if file.endswith(".dcm"):
                    file_path = os.path.join(dicom_dir, file)
                    ds = dcmread(file_path, stop_before_pixels=True)
                    sop_instance_uid = ds.SOPInstanceUID
                    sop_class_uid = ds.SOPClassUID

                    instance = {
                        "00080018": {"vr": "UI", "Value": [sop_instance_uid]},
                        "00080016": {"vr": "UI", "Value": [sop_class_uid]},
                        "0020000D": {"vr": "UI", "Value": [study_uid]},
                        "0020000E": {"vr": "UI", "Value": [series_uid]},
                        "00081190": {
                            "vr": "UR",
                            "Value": [
                                f"wadouri:http://localhost:9999/dicom/{study_id}/dicom_series/{file}"
                            ]
                        }
                    }
                    instances.append(instance)
            return instances

    return []

# Include router
app.include_router(dicomweb_router)
