import requests
import json

BASE_URL = "http://localhost:8080"
TIMEOUT = 30

# Assuming environment variables or config provide auth token or credentials
AUTH_TOKEN = "Bearer your_auth_token_here"  # Replace with actual token or method to get it
HEADERS = {
    "Authorization": AUTH_TOKEN,
    "Content-Type": "application/json"
}

def test_upload_and_edit_drills_and_lessons():
    drill_lesson_url = f"{BASE_URL}/creator/drills-lessons"
    created_id = None
    try:
        # Step 1: Upload a new drill/lesson
        new_content_payload = {
            "title": "Test Drill Lesson",
            "description": "This is a test drill/lesson for TC008.",
            "video_raw_url": "https://storage.supabase.example/raw/test_video.mp4",
            "is_processed": False
        }
        upload_resp = requests.post(drill_lesson_url, headers=HEADERS, json=new_content_payload, timeout=TIMEOUT)
        assert upload_resp.status_code == 201, f"Expected 201 Created but got {upload_resp.status_code}"
        upload_data = upload_resp.json()
        assert "id" in upload_data, "Response missing 'id' after creation"
        created_id = upload_data["id"]

        # Validate payment integration relevant to this content creation:
        # Simulate payment integration validation for creator content upload could mean a check 
        # on ability to charge/sync with payment system or reflect subscription status.
        # Here we check creator access with an imaginary endpoint to validate payment subscription state.
        payment_check_resp = requests.get(f"{BASE_URL}/payment/subscription-status", headers=HEADERS, timeout=TIMEOUT)
        assert payment_check_resp.status_code == 200, f"Payment subscription status check failed with {payment_check_resp.status_code}"
        payment_status = payment_check_resp.json().get("active")
        assert payment_status is True, "User payment status inactive, creator features should be restricted"

        # Step 2: Simulate video backend processing - patch with processed video info (mocking backend action)
        processing_payload = {
            "video_processed_url": "https://vimeo.com/processed_test_video123",
            "vimeo_video_id": "vimeo123456",
            "is_processed": True
        }
        process_resp = requests.put(f"{drill_lesson_url}/{created_id}", headers=HEADERS, json=processing_payload, timeout=TIMEOUT)
        assert process_resp.status_code == 200, f"Expected 200 OK for update but got {process_resp.status_code}"
        process_data = process_resp.json()
        assert process_data.get("is_processed") is True, "Video processing flag not updated"
        assert process_data.get("vimeo_video_id") == "vimeo123456", "Vimeo video ID not updated"

        # Step 3: Edit the drill/lesson title and description and verify
        edit_payload = {
            "title": "Updated Test Drill Lesson",
            "description": "Updated description for TC008."
        }
        edit_resp = requests.patch(f"{drill_lesson_url}/{created_id}", headers=HEADERS, json=edit_payload, timeout=TIMEOUT)
        assert edit_resp.status_code == 200, f"Expected 200 OK for patch but got {edit_resp.status_code}"
        edited_data = edit_resp.json()
        assert edited_data.get("title") == "Updated Test Drill Lesson", "Title was not updated"
        assert edited_data.get("description") == "Updated description for TC008.", "Description was not updated"

        # Step 4: Retrieve the drill/lesson to confirm all changes persisted correctly
        get_resp = requests.get(f"{drill_lesson_url}/{created_id}", headers=HEADERS, timeout=TIMEOUT)
        assert get_resp.status_code == 200, f"Expected 200 OK for get but got {get_resp.status_code}"
        get_data = get_resp.json()
        assert get_data.get("title") == "Updated Test Drill Lesson", "Title retrieval mismatch"
        assert get_data.get("description") == "Updated description for TC008.", "Description retrieval mismatch"
        assert get_data.get("is_processed") is True, "Processed status retrieval mismatch"
        assert get_data.get("vimeo_video_id") == "vimeo123456", "Vimeo ID retrieval mismatch"

        # Additional check for RLS policies (Row-Level Security)
        # Try to access the drill/lesson as another user by simulating another token (mocked here)
        alt_headers = {
            "Authorization": "Bearer another_user_token",
            "Content-Type": "application/json"
        }
        alt_get_resp = requests.get(f"{drill_lesson_url}/{created_id}", headers=alt_headers, timeout=TIMEOUT)
        # Assuming that RLS denies access for unauthorized users with 403 or 404
        assert alt_get_resp.status_code in (403, 404), f"RLS failed, unauthorized user accessed resource with status {alt_get_resp.status_code}"

    finally:
        # Cleanup - Delete created drill/lesson if exists
        if created_id:
            del_resp = requests.delete(f"{drill_lesson_url}/{created_id}", headers=HEADERS, timeout=TIMEOUT)
            # Accept successful 200 or 204 for deletion, or 404 if already deleted
            assert del_resp.status_code in (200, 204, 404), f"Unexpected status code on delete cleanup: {del_resp.status_code}"


test_upload_and_edit_drills_and_lessons()
