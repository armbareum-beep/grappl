import requests
import uuid
import time

BASE_URL = "http://localhost:8080"
TIMEOUT = 30

# Dummy auth token for the test, replace with valid token in real scenario
AUTH_TOKEN = "Bearer test-auth-token-for-international-user"

headers = {
    "Authorization": AUTH_TOKEN,
    "Content-Type": "application/json",
    "Accept": "application/json"
}

def test_paypal_payment_for_international_users():
    user_id = None
    subscription_id = None

    try:
        # Step 1: Create a new international user (simulate)
        create_user_payload = {
            "username": f"testuser_{uuid.uuid4()}",
            "email": f"testuser_{uuid.uuid4()}@example.com",
            "country": "US",
            "password": "TestPass123!"  # Added required password field
        }
        resp_create_user = requests.post(
            f"{BASE_URL}/users",
            json=create_user_payload,
            headers=headers,
            timeout=TIMEOUT,
        )
        assert resp_create_user.status_code == 201, f"User creation failed: {resp_create_user.text}"
        user_data = resp_create_user.json()
        user_id = user_data.get("id")
        assert user_id is not None, "User ID should be returned after creation"

        # Step 2: Initiate a PayPal payment for subscription purchase
        payment_payload = {
            "user_id": user_id,
            "payment_provider": "paypal",
            "payment_type": "subscription",
            "amount": 9.99,
            "currency": "USD",
            "plan_id": "international_monthly_001"
        }
        resp_payment_init = requests.post(
            f"{BASE_URL}/payments/initiate",
            json=payment_payload,
            headers=headers,
            timeout=TIMEOUT,
        )
        assert resp_payment_init.status_code == 200, f"Payment initiation failed: {resp_payment_init.text}"
        payment_data = resp_payment_init.json()
        payment_id = payment_data.get("payment_id")
        assert payment_id is not None, "Payment ID should be returned after initiation"

        # Step 3: Simulate webhook call from PayPal confirming payment success
        webhook_payload = {
            "payment_id": payment_id,
            "status": "COMPLETED",
            "provider": "paypal",
            "amount": 9.99,
            "currency": "USD",
            "user_id": user_id,
            "timestamp": int(time.time())
        }
        resp_webhook = requests.post(
            f"{BASE_URL}/webhooks/payment",
            json=webhook_payload,
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT,
        )
        assert resp_webhook.status_code == 200, f"Webhook processing failed: {resp_webhook.text}"

        # Wait briefly to allow DB update or processing (if async)
        time.sleep(2)

        # Step 4: Validate user subscription status updated in DB via API GET user subscription
        resp_subscription = requests.get(
            f"{BASE_URL}/users/{user_id}/subscription",
            headers=headers,
            timeout=TIMEOUT
        )
        assert resp_subscription.status_code == 200, f"Fetching subscription status failed: {resp_subscription.text}"
        subscription_info = resp_subscription.json()
        assert subscription_info.get("status") == "active", "Subscription status should be active after payment"
        subscription_id = subscription_info.get("subscription_id")
        assert subscription_id is not None, "Subscription ID should be present"

    finally:
        # Cleanup: Delete subscription and user created during test
        if subscription_id:
            try:
                requests.delete(
                    f"{BASE_URL}/subscriptions/{subscription_id}",
                    headers=headers,
                    timeout=TIMEOUT
                )
            except Exception:
                pass
        if user_id:
            try:
                requests.delete(
                    f"{BASE_URL}/users/{user_id}",
                    headers=headers,
                    timeout=TIMEOUT
                )
            except Exception:
                pass

test_paypal_payment_for_international_users()
