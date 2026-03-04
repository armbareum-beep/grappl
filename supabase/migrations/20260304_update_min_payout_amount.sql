-- Update minimum payout amount from 10,000 to 100,000 KRW

CREATE OR REPLACE FUNCTION submit_payout_request(p_amount numeric)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_creator_id uuid;
    v_current_balance numeric;
    v_bank_settings jsonb;
    v_request_id uuid;
BEGIN
    -- Get Creator ID from auth
    SELECT id INTO v_creator_id FROM creators WHERE id = auth.uid();

    IF v_creator_id IS NULL THEN
        RAISE EXCEPTION 'Creator not found';
    END IF;

    -- Get Bank Settings
    SELECT payout_settings INTO v_bank_settings FROM creators WHERE id = v_creator_id;

    -- Validate Bank Settings
    IF v_bank_settings IS NULL OR
       v_bank_settings->>'bankName' IS NULL OR
       v_bank_settings->>'accountNumber' IS NULL THEN
        RAISE EXCEPTION 'Please configure your payout settings first (Bank Account)';
    END IF;

    -- Check Balance
    v_current_balance := get_creator_balance(v_creator_id);

    IF v_current_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Minimum payout: 100,000 KRW
    IF p_amount < 100000 THEN
         RAISE EXCEPTION 'Minimum payout amount is 100,000 KRW';
    END IF;

    -- 1. Create Payout Request
    INSERT INTO payout_requests (
        creator_id,
        amount,
        bank_name,
        account_number,
        account_holder
    ) VALUES (
        v_creator_id,
        p_amount,
        v_bank_settings->>'bankName',
        v_bank_settings->>'accountNumber',
        v_bank_settings->>'accountHolder'
    )
    RETURNING id INTO v_request_id;

    -- 2. Insert negative entry into revenue_ledger to lock funds
    INSERT INTO revenue_ledger (
        creator_id,
        amount,
        platform_fee,
        creator_revenue,
        product_type,
        status
    ) VALUES (
        v_creator_id,
        -p_amount,
        0,
        -p_amount,
        'withdrawal',
        'pending'
    );

    RETURN json_build_object(
        'success', true,
        'request_id', v_request_id
    );
END;
$$;
