import requests
import os

BASE_URL = "http://localhost:8080"
TIMEOUT = 30

# These environment variables should be set externally for auth and Vimeo API access.
API_TOKEN = os.getenv("API_TOKEN")  # Bearer token for our backend API
VIMEO_ACCESS_TOKEN = os.getenv("VIMEO_ACCESS_TOKEN")  # OAuth token for Vimeo upload


def test_upload_processed_video_to_vimeo_and_update_db():
    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json"
    }

    def create_processed_video_resource():
        """Create a dummy processed video resource via API to upload to Vimeo."""
        # We'll simulate creating a processed video metadata record in DB
        # The API expects a POST to /videos/processed with JSON payload describing the video

        payload = {
            "title": "Test Processed Video",
            "description": "Video processed for upload test",
            "file_path": "test_processed_video.mp4"  # Assuming file already processed and available
        }
        resp = requests.post(f"{BASE_URL}/videos/processed", json=payload, headers=headers, timeout=TIMEOUT)
        resp.raise_for_status()
        return resp.json()["id"]

    def delete_processed_video_resource(video_id):
        resp = requests.delete(f"{BASE_URL}/videos/processed/{video_id}", headers=headers, timeout=TIMEOUT)
        resp.raise_for_status()

    def upload_video_to_vimeo(file_path):
        """Upload the processed video file to Vimeo using Vimeo API"""

        vimeo_headers = {
            "Authorization": f"Bearer {VIMEO_ACCESS_TOKEN}",
            "Accept": "application/vnd.vimeo.*+json;version=3.4",
            "Content-Type": "application/json"
        }

        # Vimeo upload flow: Create an upload ticket
        create_upload_resp = requests.post(
            "https://api.vimeo.com/me/videos",
            headers=vimeo_headers,
            json={
                "upload": {
                    "approach": "tus",
                    "size": os.path.getsize(file_path)
                },
                "name": "Test processed video upload",
                "description": "Uploaded by automated test"
            },
            timeout=TIMEOUT
        )
        create_upload_resp.raise_for_status()
        upload_data = create_upload_resp.json()
        upload_link = upload_data["upload"]["upload_link"]

        # Upload video file via TUS protocol (simple patch here)
        # Reading chunks and patching the upload is complex; for simplicity try a direct PUT (may fail if server expects TUS)
        # But for limited context, try a PUT request

        with open(file_path, "rb") as f:
            file_data = f.read()

        # Attempt upload with PUT to upload_link
        upload_resp = requests.put(upload_link, data=file_data, headers={
            "Tus-Resumable": "1.0.0",
            "Upload-Offset": "0",
            "Content-Type": "application/offset+octet-stream"
        }, timeout=TIMEOUT)
        upload_resp.raise_for_status()

        return upload_data["uri"].split("/")[-1]  # Vimeo video ID

    def update_video_db_with_vimeo_id(video_id, vimeo_id):
        """Update our backend DB video record with the Vimeo ID"""
        payload = {"vimeo_id": vimeo_id}
        resp = requests.put(f"{BASE_URL}/videos/processed/{video_id}/vimeo", json=payload, headers=headers, timeout=TIMEOUT)
        resp.raise_for_status()
        return resp.json()

    # Create processed video resource
    video_id = create_processed_video_resource()
    try:
        # The video file path must exist locally for upload; we assume the path from resource creation
        # Fetch the video metadata to get file_path
        resp = requests.get(f"{BASE_URL}/videos/processed/{video_id}", headers=headers, timeout=TIMEOUT)
        resp.raise_for_status()
        video_info = resp.json()
        file_path = video_info.get("file_path")
        assert file_path is not None and file_path != ""

        # Check file existence before upload
        assert os.path.isfile(file_path)

        # Upload processed video to Vimeo
        vimeo_video_id = upload_video_to_vimeo(file_path)
        assert vimeo_video_id is not None and vimeo_video_id != ""

        # Update database with Vimeo video ID
        update_resp = update_video_db_with_vimeo_id(video_id, vimeo_video_id)
        assert "vimeo_id" in update_resp
        assert update_resp["vimeo_id"] == vimeo_video_id

        # Verify database update by GET
        verify_resp = requests.get(f"{BASE_URL}/videos/processed/{video_id}", headers=headers, timeout=TIMEOUT)
        verify_resp.raise_for_status()
        verify_data = verify_resp.json()
        assert verify_data.get("vimeo_id") == vimeo_video_id

    finally:
        # Clean up: delete the processed video resource to maintain test isolation
        delete_processed_video_resource(video_id)


test_upload_processed_video_to_vimeo_and_update_db()