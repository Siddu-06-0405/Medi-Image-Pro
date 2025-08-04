import requests
import os

def test_upload():
    # Test the upload endpoint
    url = "http://localhost:9999/upload"
    
    # Check if we have any existing NIfTI files in the uploads directory
    uploads_dir = "backend/uploads"
    
    # Find any existing .nii.gz files
    nifti_files = []
    for root, dirs, files in os.walk(uploads_dir):
        for file in files:
            if file.endswith('.nii.gz'):
                nifti_files.append(os.path.join(root, file))
    
    if len(nifti_files) < 2:
        print("Need at least 2 NIfTI files (image and mask) to test upload")
        print("Available files:", nifti_files)
        return
    
    # Use the first two files as image and mask
    image_file = nifti_files[0]
    mask_file = nifti_files[1]
    
    print(f"Testing upload with:")
    print(f"  Image: {image_file}")
    print(f"  Mask: {mask_file}")
    
    # Prepare the files for upload
    files = {
        'image_file': ('image.nii.gz', open(image_file, 'rb'), 'application/octet-stream'),
        'mask_file': ('mask.nii.gz', open(mask_file, 'rb'), 'application/octet-stream')
    }
    
    data = {
        'radiography_type': 'CBCT'
    }
    
    try:
        response = requests.post(url, files=files, data=data)
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        print(f"Response text: {response.text}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print(f"Response JSON: {result}")
                print("✅ Upload successful!")
            except:
                print("✅ Upload successful (non-JSON response)")
        else:
            print("❌ Upload failed!")
            try:
                error = response.json()
                print(f"Error details: {error}")
            except:
                print("Could not parse error response as JSON")
            
    except Exception as e:
        print(f"Error testing upload: {e}")
    finally:
        # Close the files
        files['image_file'][1].close()
        files['mask_file'][1].close()

if __name__ == "__main__":
    test_upload() 