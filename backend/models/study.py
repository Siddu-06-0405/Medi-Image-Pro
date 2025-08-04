import json
from datetime import datetime
from pydantic import BaseModel
from typing import List

METADATA_FILE = "metadata.json"

class StudyMetadata(BaseModel):
    study_id: str
    study_uid: str
    study_datetime: str = datetime.now().isoformat()
    radiography_type: str
    segmentation_classes: List[str]


def save_metadata(metadata: StudyMetadata):
    try:
        with open(METADATA_FILE, "r") as f:
            data = json.load(f)
    except:
        data = []

    data.append(metadata.dict())
    with open(METADATA_FILE, "w") as f:
        json.dump(data, f, indent=2)


def load_all_metadata():
    try:
        with open(METADATA_FILE, "r") as f:
            return json.load(f)
    except:
        return []
