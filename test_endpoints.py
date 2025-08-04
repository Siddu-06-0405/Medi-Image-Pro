import requests
import json

# Test the DICOM web service endpoints
base_url = "http://localhost:9999"

def test_dicomweb_endpoints():
    print("Testing DICOM Web Service Endpoints...")
    
    # Test 1: Get studies
    print("\n1. Testing /dicomweb/studies")
    try:
        response = requests.get(f"{base_url}/dicomweb/studies")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            studies = response.json()
            print(f"Found {len(studies)} studies")
            if studies:
                study_uid = studies[0]["0020000D"]["Value"][0]
                print(f"First study UID: {study_uid}")
                
                # Test 2: Get series for this study
                print(f"\n2. Testing /dicomweb/studies/{study_uid}/series")
                response = requests.get(f"{base_url}/dicomweb/studies/{study_uid}/series")
                print(f"Status: {response.status_code}")
                if response.status_code == 200:
                    series = response.json()
                    print(f"Found {len(series)} series")
                    if series:
                        series_uid = series[0]["0020000E"]["Value"][0]
                        print(f"First series UID: {series_uid}")
                        
                        # Test 3: Get metadata for this series
                        print(f"\n3. Testing /dicomweb/studies/{study_uid}/series/{series_uid}/metadata")
                        response = requests.get(f"{base_url}/dicomweb/studies/{study_uid}/series/{series_uid}/metadata")
                        print(f"Status: {response.status_code}")
                        if response.status_code == 200:
                            metadata = response.json()
                            print(f"Found {len(metadata)} instances")
                            if metadata:
                                print(f"First instance SOPInstanceUID: {metadata[0]['00080018']['Value'][0]}")
                                print(f"First instance RetrieveURL: {metadata[0]['00081190']['Value'][0]}")
                                
                                # Test 4: Try to access the actual DICOM file
                                file_url = metadata[0]['00081190']['Value'][0]
                                print(f"\n4. Testing file access: {file_url}")
                                response = requests.get(file_url)
                                print(f"Status: {response.status_code}")
                                if response.status_code == 200:
                                    print("✓ DICOM file accessible")
                                else:
                                    print("✗ DICOM file not accessible")
                        else:
                            print(f"✗ Metadata request failed: {response.text}")
                else:
                    print(f"✗ Series request failed: {response.text}")
        else:
            print(f"✗ Studies request failed: {response.text}")
    except Exception as e:
        print(f"✗ Error: {e}")

if __name__ == "__main__":
    test_dicomweb_endpoints() 