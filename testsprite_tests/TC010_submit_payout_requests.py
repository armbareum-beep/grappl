import requests
import os

BASE_URL = "http://localhost:8080"
TIMEOUT = 30

# Assuming authentication token is required; get from env variable for security
AUTH_TOKEN = os.getenv("AUTH_TOKEN", "test-auth-token-placeholder")

HEADERS = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json"
}

def test_submit_payout_request():
    """
    Test the payout request submission process ensuring requests are recorded and processed correctly.
    This includes verifying payment integration flow aspects indirectly via payout request creation.
    """

    payout_request_endpoint = f"{BASE_URL}/creator/dashboard/payout-requests"

    payout_requests = [
        {
            "creator_id": "creator_test_id_123",
            "payment_method": "PayPal",
            "amount": 150.00,
            "currency": "USD",
            "paypal_email": "creator_test_paypal@example.com"
        },
        {
            "creator_id": "creator_test_id_123",
            "payment_method": "Portone",
            "amount": 200000,
            "currency": "KRW",
            "portone_phone": "010-1234-5678"
        }
    ]

    created_request_ids = []

    try:
        for payout_request in payout_requests:
            response = requests.post(payout_request_endpoint, json=payout_request, headers=HEADERS, timeout=TIMEOUT)
            assert response.status_code == 201, f"Failed to create payout request: {response.text}"

            json_resp = response.json()
            assert "id" in json_resp, "Response missing payout request ID"
            assert json_resp.get("status") in ("pending", "processing"), "Payout request has unexpected status"
            assert json_resp.get("payment_method") == payout_request["payment_method"], "Payment method mismatch in response"
            assert abs(float(json_resp.get("amount", 0)) - float(payout_request["amount"])) < 0.01, "Amount mismatch"
            assert json_resp.get("currency") == payout_request["currency"], "Currency mismatch"

            created_request_ids.append(json_resp["id"])

            get_resp = requests.get(f"{payout_request_endpoint}/{json_resp['id']}", headers=HEADERS, timeout=TIMEOUT)
            assert get_resp.status_code == 200, f"Failed to retrieve created payout request ID {json_resp['id']}"
            get_data = get_resp.json()
            assert get_data["id"] == json_resp["id"], "Mismatch in retrieved payout request ID"
            assert get_data["status"] == json_resp["status"], "Mismatch in payout request status"

    finally:
        for req_id in created_request_ids:
            del_resp = requests.delete(f"{payout_request_endpoint}/{req_id}", headers=HEADERS, timeout=TIMEOUT)
            assert del_resp.status_code in (200, 204), f"Failed to delete payout request ID {req_id}"

test_submit_payout_request()
