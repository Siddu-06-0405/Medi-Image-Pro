import os
import time
import uuid
import numpy as np
import nibabel as nib
import SimpleITK as sitk
import pydicom
from datetime import datetime
from pydicom.uid import generate_uid

from utils.label_dict import label_dict
from highdicom.seg.sop import Segmentation
from highdicom.content import AlgorithmIdentificationSequence
from highdicom.seg.content import SegmentDescription


def writeSlices(series_tag_values, new_img, i, out_dir):
    image_slice = sitk.Cast(new_img[:, :, i], sitk.sitkUInt16)

    writer = sitk.ImageFileWriter()
    writer.KeepOriginalImageUIDOn()

    # Series-level tags
    for tag, value in series_tag_values:
        image_slice.SetMetaData(tag, value)

    # Slice-specific tags
    image_slice.SetMetaData("0008|0012", time.strftime("%Y%m%d"))  # Creation Date
    image_slice.SetMetaData("0008|0013", time.strftime("%H%M%S"))  # Creation Time
    image_slice.SetMetaData("0008|0060", "CT")                     # Modality
    image_slice.SetMetaData(
        "0020|0032",
        "\\".join(map(str, new_img.TransformIndexToPhysicalPoint((0, 0, i))))
    )  # Image Position
    image_slice.SetMetaData("0020|0013", str(i))  # Instance Number

    filename = os.path.join(out_dir, f"slice{i:04d}.dcm")
    writer.SetFileName(filename)
    writer.Execute(image_slice)


def nifti_to_dicom_series(image_data, output_dir):
    os.makedirs(output_dir, exist_ok=True)

    new_img = sitk.GetImageFromArray(image_data)
    new_img = sitk.Cast(new_img, sitk.sitkUInt8)

    modification_time = time.strftime("%H%M%S")
    modification_date = time.strftime("%Y%m%d")
    direction = new_img.GetDirection()

    series_uid = f"1.2.826.0.1.3680043.2.1125.{modification_date}.1{modification_time}"
    study_uid = f"1.2.826.0.1.3680043.2.1125.{modification_date}{modification_time}"

    series_tag_values = [
        ("0008|0031", modification_time),
        ("0008|0021", modification_date),
        ("0008|0008", "DERIVED\\SECONDARY"),
        ("0020|000e", series_uid),
        ("0020|000d", study_uid),
        ("0020|0037", "\\".join(map(str, [
            direction[0], direction[3], direction[6],
            direction[1], direction[4], direction[7],
        ]))),
        ("0008|103e", "Created-MediImagePro"),
    ]

    for i in range(new_img.GetDepth()):
        writeSlices(series_tag_values, new_img, i, output_dir)

    print(f"DICOM series saved to {output_dir}")
    return study_uid, series_uid

def create_dicom_segmentation(mask_data, reference_dicom_path, output_path):
    import pydicom
    from pydicom.dataset import Dataset, FileDataset
    import datetime
    import uuid

    # Read the reference DICOM slice (first slice)
    ref_ds = pydicom.dcmread(reference_dicom_path)

    # Prepare metadata
    file_meta = pydicom.Dataset()
    file_meta.MediaStorageSOPClassUID = pydicom.uid.generate_uid()
    file_meta.MediaStorageSOPInstanceUID = pydicom.uid.generate_uid()
    file_meta.TransferSyntaxUID = pydicom.uid.ExplicitVRLittleEndian
    file_meta.ImplementationClassUID = pydicom.uid.PYDICOM_IMPLEMENTATION_UID

    # Create FileDataset instance
    ds = FileDataset(output_path, {}, file_meta=file_meta, preamble=b"\0" * 128)
    dt = datetime.datetime.now()
    ds.ContentDate = dt.strftime('%Y%m%d')
    ds.ContentTime = dt.strftime('%H%M%S')
    ds.SOPClassUID = file_meta.MediaStorageSOPClassUID
    ds.SOPInstanceUID = file_meta.MediaStorageSOPInstanceUID
    ds.Modality = "SEG"
    ds.PatientName = ref_ds.PatientName if 'PatientName' in ref_ds else "Anon"
    ds.PatientID = ref_ds.PatientID if 'PatientID' in ref_ds else "000000"
    ds.StudyInstanceUID = ref_ds.StudyInstanceUID
    ds.SeriesInstanceUID = pydicom.uid.generate_uid()
    ds.Rows, ds.Columns = mask_data.shape[1], mask_data.shape[2]
    ds.NumberOfFrames = mask_data.shape[0]
    ds.BitsAllocated = 8
    ds.BitsStored = 8
    ds.HighBit = 7
    ds.PixelRepresentation = 0
    ds.SamplesPerPixel = 1
    ds.PhotometricInterpretation = "MONOCHROME2"
    ds.ImageType = ['DERIVED', 'PRIMARY', 'SEGMENTATION']
    ds.SegmentSequence = pydicom.Sequence([])

    # Add dummy pixel data (binary mask)
    ds.PixelData = (mask_data.astype(np.uint8)).tobytes()

    # Save the file
    ds.save_as(output_path)
    print(f"✅ Fallback DICOM SEG saved at: {output_path}")

def process_upload(study_id, image_path, mask_path):
    try:
        dicom_path = f"uploads/{study_id}/dicom_series"
        seg_path = f"uploads/{study_id}/segmentation"
        os.makedirs(dicom_path, exist_ok=True)
        os.makedirs(seg_path, exist_ok=True)

        print(f"Loading image from: {image_path}")
        image = nib.load(image_path)
        print(f"Loading mask from: {mask_path}")
        mask = nib.load(mask_path)

        image_data = image.get_fdata()
        mask_data = mask.get_fdata()

        print(f"Image shape: {image_data.shape}")
        print(f"Mask shape: {mask_data.shape}")
        print(f"Unique labels in mask: {np.unique(mask_data)}")

        study_uid, series_uid = nifti_to_dicom_series(image_data, dicom_path)

        seg_file_path = os.path.join(seg_path, "segmentation.dcm")
        reference_dicom_path = os.path.join(dicom_path, "slice0000.dcm")

        create_dicom_segmentation(mask_data, reference_dicom_path, seg_file_path)

        present_labels = np.unique(mask_data.astype(np.uint8))
        present_labels = present_labels[present_labels != 0]

        segmentation_classes = [
            label_dict.get(label, f"Class-{label}")
            for label in present_labels
            if label in label_dict
        ]

        print(f"Processed successfully. Study UID: {study_uid}")
        print(f"Segmentation classes: {segmentation_classes}")

        return study_uid, segmentation_classes

    except Exception as e:
        print(f"Error in process_upload: {str(e)}")
        raise
