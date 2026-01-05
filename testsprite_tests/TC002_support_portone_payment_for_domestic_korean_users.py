import requests
import uuid

BASE_URL = "http://localhost:8080"
TIMEOUT = 30
HEADERS = {
    "Content-Type": "application/json",
    # Add authorization header here if required, e.g.:
    # "Authorization": "Bearer <token>"
}

def test_support_portone_payment_for_domestic_korean_users():
    user_id = None
    subscription_id = None
    try:
        # Step 1: Create a Korean domestic user (assuming an endpoint exists)
        user_payload = {
            "username": f"testuser_{uuid.uuid4().hex[:8]}",
            "email": f"testuser_{uuid.uuid4().hex[:8]}@korea.kr",
            "country": "KR"
        }
        res_user = requests.post(f"{BASE_URL}/users", json=user_payload, headers=HEADERS, timeout=TIMEOUT)
        assert res_user.status_code == 201, f"User creation failed: {res_user.text}"
        user = res_user.json()
        user_id = user.get("id")
        assert user_id, "User ID not returned after user creation"

        # Step 2: Initiate a payment using Portone for subscription/content purchase
        payment_payload = {
            "user_id": user_id,
            "payment_method": "Portone",
            "amount": 12000,  # Assume 12,000 KRW for test subscription
            "currency": "KRW",
            "subscription_type": "premium_monthly"
        }
        res_payment = requests.post(f"{BASE_URL}/payments", json=payment_payload, headers=HEADERS, timeout=TIMEOUT)
        assert res_payment.status_code == 200, f"Portone payment initiation failed: {res_payment.text}"
        payment_response = res_payment.json()
        payment_id = payment_response.get("payment_id")
        assert payment_id, "Payment ID not returned after payment initiation"
        payment_status = payment_response.get("status")
        assert payment_status in ["pending", "processing"], "Unexpected payment status on creation"

        # Step 3: Simulate payment confirmation webhook call (Portone webhook)
        webhook_payload = {
            "payment_id": payment_id,
            "status": "success",
            "user_id": user_id,
            "payment_method": "Portone",
            "amount": 12000,
            "currency": "KRW"
        }
        res_webhook = requests.post(f"{BASE_URL}/webhooks/payment-confirmation", json=webhook_payload, headers=HEADERS, timeout=TIMEOUT)
        assert res_webhook.status_code == 200, f"Payment confirmation webhook failed: {res_webhook.text}"
        webhook_response = res_webhook.json()
        assert webhook_response.get("updated") is True, "Subscription status not updated after webhook"

        # Step 4: Verify the user's subscription status is updated in the database
        res_user_status = requests.get(f"{BASE_URL}/users/{user_id}/subscription-status", headers=HEADERS, timeout=TIMEOUT)
        assert res_user_status.status_code == 200, f"Failed to get subscription status: {res_user_status.text}"
        status_data = res_user_status.json()
        assert status_data.get("active") is True, "User subscription status not active after payment"
        assert status_data.get("subscription_type") == "premium_monthly", "Subscription type mismatch"

    finally:
        # Cleanup: Delete the created user and related subscriptions or payments if possible
        if user_id:
            try:
                requests.delete(f"{BASE_URL}/users/{user_id}", headers=HEADERS, timeout=TIMEOUT)
            except Exception:
                pass

test_support_portone_payment_for_domestic_korean_users()