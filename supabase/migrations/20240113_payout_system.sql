-- 1. Create Payout Requests Table
CREATE TABLE IF NOT EXISTS payout_requests (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id uuid REFERENCES creators(id) NOT NULL,
    amount numeric NOT NULL CHECK (amount > 0),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
    bank_name text,
    account_number text,
    account_holder text,
    requested_at timestamp with time zone DEFAULT now(),
    processed_at timestamp with time zone,
    admin_note text
);

-- 2. Function to Get Creator Balance
CREATE OR REPLACE FUNCTION get_creator_balance(p_creator_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance numeric;
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_balance
    FROM revenue_ledger
    WHERE creator_id = p_creator_id
    AND status IN ('processed', 'pending'); -- 'pending' withdrawals are negative, effectively locking funds

    -- Note: withdrawals are inserted as negative amounts in revenue_ledger.
    -- If 'pending' withdrawals are NOT in ledger yet, we must subtract them.
    -- My design: submit_payout_request inserts into ledger immediately as negative.
    
    RETURN v_balance;
END;
$$;

-- 3. Function to Submit Payout Request
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
    -- Get current user's creator_id
    SELECT id, payout_settings INTO v_creator_id, v_bank_settings
    FROM creators
    WHERE id = auth.uid();

    IF v_creator_id IS NULL THEN
        RAISE EXCEPTION 'Creator profile not found';
    END IF;

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

    IF p_amount < 10000 THEN
         RAISE EXCEPTION 'Minimum payout amount is 10,000 KRW';
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
    ) RETURNING id INTO v_request_id;

    -- 2. Lock Funds in Ledger (Negative Entry)
    INSERT INTO revenue_ledger (
        creator_id,
        amount,
        revenue_type, -- Add this column if missing or reuse existing logic
        product_type,
        description,
        status,
        recognition_date,
        payout_request_id -- Ideally link this
    ) VALUES (
        v_creator_id,
        -p_amount,
        'withdrawal',
        'withdrawal',
        'Payout Request ' || v_request_id,
        'pending',
        CURRENT_DATE,
        v_request_id -- Need to add this column to ledger if we want strict linking
    );

    RETURN json_build_object('success', true, 'request_id', v_request_id);
END;
$$;

-- Optional: Add payout_request_id to revenue_ledger for linking
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'revenue_ledger' AND column_name = 'payout_request_id') THEN
        ALTER TABLE revenue_ledger ADD COLUMN payout_request_id uuid REFERENCES payout_requests(id);
    END IF;
END $$;
