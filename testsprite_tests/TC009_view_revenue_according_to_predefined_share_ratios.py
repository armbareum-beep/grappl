import requests
import os

BASE_URL = "http://localhost:8080"
TIMEOUT = 30

# Assuming authentication is required, we get an auth token from env variables
AUTH_TOKEN = os.getenv("AUTH_TOKEN", "test-auth-token")

HEADERS = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json"
}

def test_TC009_view_revenue_according_to_predefined_share_ratios():
    """
    Verify that creators can view their revenue accurately calculated according to the predefined share ratios, such as 8:2.
    This test will simulate querying the revenue endpoint, verify correct amounts, and assume payment integration and video
    processing have been done beforehand.
    """

    # Step 1: Identify or create a creator resource for the test
    creator_id = None
    try:
        # Create a test creator to ensure isolated data and correct RLS enforcement
        create_creator_resp = requests.post(
            f"{BASE_URL}/api/creators",
            headers=HEADERS,
            json={
                "name": "Test Creator Revenue",
                "email": "testcreator_revenue@example.com"
            },
            timeout=TIMEOUT
        )
        assert create_creator_resp.status_code == 201, f"Failed to create test creator: {create_creator_resp.text}"
        creator_data = create_creator_resp.json()
        creator_id = creator_data.get("id")
        assert creator_id, "Creator ID missing in creation response"

        # Step 2: Simulate revenues records (normally this would be set up in fixtures or the test DB).
        # For testing purpose, create some payment transactions that represent revenue distribution with 8:2 split.
        # Assume API supports adding test revenue entries for creators at /api/creators/{id}/revenues

        # Total revenue example 1000; creator share 80%, platform share 20%

        revenue_payload = {
            "transactions": [
                {
                    "payment_method": "PayPal",
                    "total_amount": 1000,
                    "creator_share_ratio": 0.8,
                    "platform_share_ratio": 0.2,
                    "status": "completed"
                },
                {
                    "payment_method": "Portone",
                    "total_amount": 500,
                    "creator_share_ratio": 0.8,
                    "platform_share_ratio": 0.2,
                    "status": "completed"
                }
            ]
        }

        add_revenue_resp = requests.post(
            f"{BASE_URL}/api/creators/{creator_id}/revenues",
            headers=HEADERS,
            json=revenue_payload,
            timeout=TIMEOUT
        )
        assert add_revenue_resp.status_code == 201, f"Failed to add revenue transactions: {add_revenue_resp.text}"

        # Step 3: Query the revenue summary endpoint that returns revenue calculated according to the share ratios
        revenue_view_resp = requests.get(
            f"{BASE_URL}/api/creators/{creator_id}/revenue-summary",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert revenue_view_resp.status_code == 200, f"Failed to get revenue summary: {revenue_view_resp.text}"
        revenue_summary = revenue_view_resp.json()

        # Validate revenue breakdown matches 8:2 share ratio calculation
        # Expected creator revenue: (1000 * 0.8) + (500 * 0.8) = 1200
        # Expected platform revenue: (1000 * 0.2) + (500 * 0.2) = 300

        expected_creator_revenue = 1200
        expected_platform_revenue = 300

        actual_creator_revenue = revenue_summary.get("creator_revenue")
        actual_platform_revenue = revenue_summary.get("platform_revenue")

        assert actual_creator_revenue is not None, "creator_revenue missing in response"
        assert actual_platform_revenue is not None, "platform_revenue missing in response"

        # Allow minor floating point precision delta
        assert abs(actual_creator_revenue - expected_creator_revenue) < 0.01, (
            f"Creator revenue expected {expected_creator_revenue}, got {actual_creator_revenue}"
        )
        assert abs(actual_platform_revenue - expected_platform_revenue) < 0.01, (
            f"Platform revenue expected {expected_platform_revenue}, got {actual_platform_revenue}"
        )

        # Step 4: Validate RLS policy by attempting to access revenue with a different user token (simulate by omitting auth or using a bad token)
        invalid_headers = {
            "Authorization": "Bearer invalid-token",
            "Content-Type": "application/json"
        }
        unauthorized_resp = requests.get(
            f"{BASE_URL}/api/creators/{creator_id}/revenue-summary",
            headers=invalid_headers,
            timeout=TIMEOUT
        )
        assert unauthorized_resp.status_code in (401, 403), (
            f"Unauthorized access should be denied, got status {unauthorized_resp.status_code}"
        )

    finally:
        # Clean up: delete the created test creator and related data
        if creator_id:
            requests.delete(
                f"{BASE_URL}/api/creators/{creator_id}",
                headers=HEADERS,
                timeout=TIMEOUT
            )

test_TC009_view_revenue_according_to_predefined_share_ratios()