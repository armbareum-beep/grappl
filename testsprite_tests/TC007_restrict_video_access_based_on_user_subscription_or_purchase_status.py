import requests
import os

BASE_URL = "http://localhost:8080"
TIMEOUT = 30

# Assuming environment variables or a config file provide these tokens
PAYPAL_TEST_USER_TOKEN = os.getenv("PAYPAL_TEST_USER_TOKEN", "paypal_test_user_token")
PORTONE_TEST_USER_TOKEN = os.getenv("PORTONE_TEST_USER_TOKEN", "portone_test_user_token")
UNSUBSCRIBED_USER_TOKEN = os.getenv("UNSUBSCRIBED_USER_TOKEN", "unsubscribed_user_token")

# Helper functions to simulate/pay for subscription or purchase status
def simulate_paypal_subscription(user_token):
    url = f"{BASE_URL}/payments/paypal/subscribe"
    headers = {"Authorization": f"Bearer {user_token}"}
    data = {
        "plan_id": "international_basic"  # example plan
    }
    resp = requests.post(url, headers=headers, json=data, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()

def simulate_portone_subscription(user_token):
    url = f"{BASE_URL}/payments/portone/subscribe"
    headers = {"Authorization": f"Bearer {user_token}"}
    data = {
        "plan_id": "domestic_basic"  # example plan
    }
    resp = requests.post(url, headers=headers, json=data, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()

def create_video_for_test():
    url = f"{BASE_URL}/videos"
    # Test video payload (minimal required metadata)
    data = {
        "title": "Test Video Access Control",
        "description": "Video for access control test",
        "raw_video_url": "http://example.com/rawvideo.mp4"  # dummy raw video url
    }
    # Use an admin or creator token if needed, else anonymous
    headers = {}
    resp = requests.post(url, json=data, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()["video_id"]

def delete_video(video_id):
    url = f"{BASE_URL}/videos/{video_id}"
    headers = {}
    requests.delete(url, headers=headers, timeout=TIMEOUT)  # best effort

def get_video_access(video_id, user_token):
    url = f"{BASE_URL}/videos/{video_id}/access"
    headers = {"Authorization": f"Bearer {user_token}"} if user_token else {}
    resp = requests.get(url, headers=headers, timeout=TIMEOUT)
    return resp

def test_restrict_video_access_subscription_purchase():
    # Create a video resource to test access
    video_id = create_video_for_test()

    try:
        # 1. Test access with unsubscribed/unpurchased user (should be denied)
        resp_unsub = get_video_access(video_id, UNSUBSCRIBED_USER_TOKEN)
        assert resp_unsub.status_code in (401, 403), "Unsubscribed user should be denied access"
        
        # 2. Test access with PayPal subscribed user (should be allowed)
        simulate_paypal_subscription(PAYPAL_TEST_USER_TOKEN)
        resp_paypal = get_video_access(video_id, PAYPAL_TEST_USER_TOKEN)
        assert resp_paypal.status_code == 200, "PayPal subscribed user should have access"
        json_paypal = resp_paypal.json()
        assert "video_url" in json_paypal and json_paypal["video_url"].startswith("http"), "Video URL must be present for subscribed user"

        # 3. Test access with Portone subscribed user (should be allowed)
        simulate_portone_subscription(PORTONE_TEST_USER_TOKEN)
        resp_portone = get_video_access(video_id, PORTONE_TEST_USER_TOKEN)
        assert resp_portone.status_code == 200, "Portone subscribed user should have access"
        json_portone = resp_portone.json()
        assert "video_url" in json_portone and json_portone["video_url"].startswith("http"), "Video URL must be present for subscribed user"

        # 4. Test no token access (public or anonymous) - denied
        resp_public = get_video_access(video_id, None)
        assert resp_public.status_code in (401, 403), "Anonymous user should be denied access"

    finally:
        # Cleanup video resource after test
        delete_video(video_id)

test_restrict_video_access_subscription_purchase()