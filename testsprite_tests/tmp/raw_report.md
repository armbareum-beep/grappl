
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** grapplay
- **Date:** 2026-01-05
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001
- **Test Name:** support paypal payment for international users
- **Test Code:** [TC001_support_paypal_payment_for_international_users.py](./TC001_support_paypal_payment_for_international_users.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 114, in <module>
  File "<string>", line 35, in test_paypal_payment_for_international_users
AssertionError: User creation failed: 

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/eebbe3b0-cf53-435e-b4cf-c73801839562/97b5df3e-edfe-4dd0-bbcc-ad07ee517c75
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002
- **Test Name:** support portone payment for domestic korean users
- **Test Code:** [TC002_support_portone_payment_for_domestic_korean_users.py](./TC002_support_portone_payment_for_domestic_korean_users.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 73, in <module>
  File "<string>", line 23, in test_support_portone_payment_for_domestic_korean_users
AssertionError: User creation failed: 

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/eebbe3b0-cf53-435e-b4cf-c73801839562/00f27e31-522e-4bb5-af32-9e81ec1d5a09
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003
- **Test Name:** handle payment confirmation webhooks
- **Test Code:** [TC003_handle_payment_confirmation_webhooks.py](./TC003_handle_payment_confirmation_webhooks.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 87, in <module>
  File "<string>", line 43, in test_handle_payment_confirmation_webhooks
AssertionError: PayPal webhook not accepted: 

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/eebbe3b0-cf53-435e-b4cf-c73801839562/7692ddbd-d9f3-4f4f-870e-f6006ff9a9e2
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004
- **Test Name:** upload raw videos to supabase storage
- **Test Code:** [TC004_upload_raw_videos_to_supabase_storage.py](./TC004_upload_raw_videos_to_supabase_storage.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 58, in <module>
  File "<string>", line 34, in test_upload_raw_video_to_supabase_storage
AssertionError: Upload failed: 404 

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/eebbe3b0-cf53-435e-b4cf-c73801839562/3fe21fda-e249-4e0f-893c-6d6d753c4e4b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005
- **Test Name:** process videos using backend ffmpeg service
- **Test Code:** [TC005_process_videos_using_backend_ffmpeg_service.py](./TC005_process_videos_using_backend_ffmpeg_service.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 88, in <module>
  File "<string>", line 33, in test_process_videos_using_backend_ffmpeg_service
AssertionError: FFmpeg processing initiation failed: 

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/eebbe3b0-cf53-435e-b4cf-c73801839562/25be649e-997a-4c65-9e99-06c5760a4f35
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006
- **Test Name:** upload processed videos to vimeo and update database
- **Test Code:** [TC006_upload_processed_videos_to_vimeo_and_update_database.py](./TC006_upload_processed_videos_to_vimeo_and_update_database.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 121, in <module>
  File "<string>", line 88, in test_upload_processed_video_to_vimeo_and_update_db
  File "<string>", line 29, in create_processed_video_resource
  File "/var/task/requests/models.py", line 1024, in raise_for_status
    raise HTTPError(http_error_msg, response=self)
requests.exceptions.HTTPError: 404 Client Error: Not Found for url: http://localhost:8080/videos/processed

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/eebbe3b0-cf53-435e-b4cf-c73801839562/67b044ca-1637-41d6-bdfa-71045ceaa373
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007
- **Test Name:** restrict video access based on user subscription or purchase status
- **Test Code:** [TC007_restrict_video_access_based_on_user_subscription_or_purchase_status.py](./TC007_restrict_video_access_based_on_user_subscription_or_purchase_status.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 89, in <module>
  File "<string>", line 60, in test_restrict_video_access_subscription_purchase
  File "<string>", line 44, in create_video_for_test
  File "/var/task/requests/models.py", line 1024, in raise_for_status
    raise HTTPError(http_error_msg, response=self)
requests.exceptions.HTTPError: 404 Client Error: Not Found for url: http://localhost:8080/videos

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/eebbe3b0-cf53-435e-b4cf-c73801839562/c1728d90-f5ca-4b5b-a651-6bf5e89b647d
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008
- **Test Name:** upload and edit drills and lessons
- **Test Code:** [TC008_upload_and_edit_drills_and_lessons.py](./TC008_upload_and_edit_drills_and_lessons.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 90, in <module>
  File "<string>", line 26, in test_upload_and_edit_drills_and_lessons
AssertionError: Expected 201 Created but got 404

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/eebbe3b0-cf53-435e-b4cf-c73801839562/5a5ab02a-31e0-4e1f-9d50-7a764f16a95f
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009
- **Test Name:** view revenue according to predefined share ratios
- **Test Code:** [TC009_view_revenue_according_to_predefined_share_ratios.py](./TC009_view_revenue_according_to_predefined_share_ratios.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 126, in <module>
  File "<string>", line 35, in test_TC009_view_revenue_according_to_predefined_share_ratios
AssertionError: Failed to create test creator: 

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/eebbe3b0-cf53-435e-b4cf-c73801839562/70986a41-519b-4721-b4c7-d5d12d77e1e4
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010
- **Test Name:** submit payout requests
- **Test Code:** [TC010_submit_payout_requests.py](./TC010_submit_payout_requests.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 67, in <module>
  File "<string>", line 45, in test_submit_payout_request
AssertionError: Failed to create payout request: 

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/eebbe3b0-cf53-435e-b4cf-c73801839562/ee06b5dd-2b4b-45d0-8f8e-14cd793ab2ab
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **0.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---