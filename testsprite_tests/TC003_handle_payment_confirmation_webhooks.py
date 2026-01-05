import requests
import time

BASE_URL = "http://localhost:8080"
TIMEOUT = 30
HEADERS_JSON = {"Content-Type": "application/json"}

def test_handle_payment_confirmation_webhooks():
    # Simulate payment confirmation webhook payloads
    paypal_webhook_payload = {
        "transaction_id": "PAYPAL123456",
        "status": "SUCCESS",
        "user_id": "user-paypal-001",
        "subscription_plan": "premium",
        "payment_method": "PayPal",
        "amount": 9.99,
        "currency": "USD",
        "timestamp": int(time.time())
    }

    portone_webhook_payload = {
        "transaction_id": "PORTONE987654",
        "status": "SUCCESS",
        "user_id": "user-portone-001",
        "subscription_plan": "standard",
        "payment_method": "Portone",
        "amount": 11900,
        "currency": "KRW",
        "timestamp": int(time.time())
    }

    # Endpoint to receive payment webhooks
    webhook_endpoint = f"{BASE_URL}/webhooks/payment-confirmation"

    try:
        # Send PayPal webhook simulation
        response_paypal = requests.post(
            webhook_endpoint,
            json=paypal_webhook_payload,
            headers=HEADERS_JSON,
            timeout=TIMEOUT
        )
        assert response_paypal.status_code == 200, f"PayPal webhook not accepted: {response_paypal.text}"

        # Verify user subscription status update for PayPal user
        get_sub_paypal = requests.get(
            f"{BASE_URL}/users/{paypal_webhook_payload['user_id']}/subscription",
            timeout=TIMEOUT
        )
        assert get_sub_paypal.status_code == 200, f"Failed to get PayPal user subscription: {get_sub_paypal.text}"
        sub_data_paypal = get_sub_paypal.json()
        assert sub_data_paypal.get("status") == "active", "PayPal user subscription not updated to active"
        assert sub_data_paypal.get("plan") == paypal_webhook_payload["subscription_plan"], "PayPal subscription plan mismatch"

        # Send Portone webhook simulation
        response_portone = requests.post(
            webhook_endpoint,
            json=portone_webhook_payload,
            headers=HEADERS_JSON,
            timeout=TIMEOUT
        )
        assert response_portone.status_code == 200, f"Portone webhook not accepted: {response_portone.text}"

        # Verify user subscription status update for Portone user
        get_sub_portone = requests.get(
            f"{BASE_URL}/users/{portone_webhook_payload['user_id']}/subscription",
            timeout=TIMEOUT
        )
        assert get_sub_portone.status_code == 200, f"Failed to get Portone user subscription: {get_sub_portone.text}"
        sub_data_portone = get_sub_portone.json()
        assert sub_data_portone.get("status") == "active", "Portone user subscription not updated to active"
        assert sub_data_portone.get("plan") == portone_webhook_payload["subscription_plan"], "Portone subscription plan mismatch"

        # Check RLS enforcement and environment variables indirectly by asserting that no unauthorized data is returned
        # For simplicity, assume normal user cannot see other user's subscription
        other_user_check = requests.get(
            f"{BASE_URL}/users/{paypal_webhook_payload['user_id']}/subscription",
            headers={"X-User-Id": "unauthorized-user"},
            timeout=TIMEOUT
        )
        # Expecting forbidden or empty result due to RLS
        assert other_user_check.status_code in (401, 403, 404), "RLS violated: unauthorized user can access subscription info"

    except requests.RequestException as e:
        assert False, f"HTTP request failed: {e}"

test_handle_payment_confirmation_webhooks()
