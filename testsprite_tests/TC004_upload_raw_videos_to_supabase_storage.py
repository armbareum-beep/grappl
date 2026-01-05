import requests
import os

BASE_URL = "http://localhost:8080"
TIMEOUT = 30

def test_upload_raw_video_to_supabase_storage():
    # Assuming environment variables for authentication and Supabase config
    SUPABASE_API_KEY = os.getenv("SUPABASE_API_KEY")
    SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "raw-videos")
    AUTH_TOKEN = os.getenv("AUTH_TOKEN")  # Bearer token for user auth if needed

    headers = {
        "apikey": SUPABASE_API_KEY,
    }

    if AUTH_TOKEN:
        headers["Authorization"] = f"Bearer {AUTH_TOKEN}"

    # Sample raw video content for upload - using bytes for test (simulate a small video file)
    video_filename = "test_video.mp4"
    video_content = b'\x00\x00\x00\x14ftypiso6\x00\x00\x00\x00iso6mp41'  # minimal mp4 header bytes

    # Endpoint to upload raw videos to Supabase storage
    # Assuming the API endpoint POST /storage/upload accepts multipart file upload and query param for bucket
    upload_url = f"{BASE_URL}/storage/upload?bucket={SUPABASE_BUCKET}"

    files = {
        "file": (video_filename, video_content, "video/mp4"),
    }

    # Upload video
    response = requests.post(upload_url, headers=headers, files=files, timeout=TIMEOUT)
    assert response.status_code == 200, f"Upload failed: {response.status_code} {response.text}"

    json_response = response.json()
    # Expecting something like {"path": "raw-videos/test_video.mp4", "url": "..."} in response
    assert "path" in json_response, "Response missing 'path'"
    assert SUPABASE_BUCKET in json_response["path"], "Uploaded file path bucket mismatch"
    assert "url" in json_response, "Response missing 'url'"

    uploaded_url = json_response["url"]

    # Validate access to uploaded video
    access_resp = requests.get(uploaded_url, headers=headers, timeout=TIMEOUT)
    # Video should be accessible with status 200 (depending on RLS, might be signed url)
    assert access_resp.status_code == 200, f"Uploaded video is not accessible: {access_resp.status_code}"

    # Clean up: delete the uploaded video after test
    try:
        delete_url = f"{BASE_URL}/storage/remove?bucket={SUPABASE_BUCKET}&path={json_response['path']}"
        delete_resp = requests.delete(delete_url, headers=headers, timeout=TIMEOUT)
        assert delete_resp.status_code == 200, f"Failed to delete test video: {delete_resp.status_code} {delete_resp.text}"
    except Exception as e:
        # Warn but don't fail test on cleanup failure
        print(f"Warning: cleanup failed: {e}")

test_upload_raw_video_to_supabase_storage()
