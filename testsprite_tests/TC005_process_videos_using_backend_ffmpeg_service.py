import requests
import time

BASE_URL = "http://localhost:8080"
TIMEOUT = 30

def test_process_videos_using_backend_ffmpeg_service():
    headers = {
        "Content-Type": "application/json",
        # Authentication header placeholder; replace with actual token if needed
        # "Authorization": "Bearer <token>"
    }

    # For testing, assign a dummy raw_video_id assuming the raw video is already uploaded
    raw_video_id = "test_raw_video_id"

    # Step 2: Call backend FFmpeg service to process the video
    process_payload = {
        "video_id": raw_video_id,
        "operations": [
            {"type": "cut", "start": 5, "end": 10},
            {"type": "join", "clips": [
                {"video_id": raw_video_id, "start": 10, "end": 15}
            ]}
        ]
    }
    process_response = requests.post(
        f"{BASE_URL}/videos/process",
        json=process_payload,
        headers=headers,
        timeout=TIMEOUT
    )
    assert process_response.status_code == 202, f"FFmpeg processing initiation failed: {process_response.text}"

    # The processing might be asynchronous; check processing status:
    process_job = process_response.json()
    job_id = process_job.get("job_id")
    assert job_id, "Job ID missing in process response"

    # Poll for processing completion with timeout limit (e.g. max 60 seconds)
    max_wait = 60
    wait_interval = 5
    elapsed = 0
    status = None
    processed_video_id = None

    while elapsed < max_wait:
        status_resp = requests.get(
            f"{BASE_URL}/videos/process/status/{job_id}",
            headers=headers,
            timeout=TIMEOUT
        )
        assert status_resp.status_code == 200, f"Failed to get processing status: {status_resp.text}"
        status_json = status_resp.json()
        status = status_json.get("status")
        if status == "completed":
            processed_video_id = status_json.get("processed_video_id")
            break
        elif status == "failed":
            assert False, "Video processing failed"
        time.sleep(wait_interval)
        elapsed += wait_interval

    assert status == "completed", "Video processing did not complete in time"
    assert processed_video_id, "Processed video ID missing after completion"

    # Step 3: Validate processed video is ready to upload (metadata check)
    meta_resp = requests.get(
        f"{BASE_URL}/videos/{processed_video_id}/metadata",
        headers=headers,
        timeout=TIMEOUT
    )
    assert meta_resp.status_code == 200, f"Failed to fetch processed video metadata: {meta_resp.text}"
    metadata = meta_resp.json()
    # Check some expected metadata keys
    assert "duration" in metadata and metadata["duration"] > 0, "Invalid video duration"
    assert "format" in metadata, "Video format missing"
    # Optionally check that duration is approx 10 seconds (cut 5s+joined 5s)
    expected_duration_range = (9, 11)
    assert expected_duration_range[0] <= metadata["duration"] <= expected_duration_range[1], \
        f"Processed video duration {metadata['duration']} not in expected range"

    # Clean up: delete processed video if created
    if processed_video_id:
        requests.delete(f"{BASE_URL}/videos/{processed_video_id}", headers=headers, timeout=TIMEOUT)


test_process_videos_using_backend_ffmpeg_service()
