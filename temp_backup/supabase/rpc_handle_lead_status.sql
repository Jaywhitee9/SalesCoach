
-- RPC to handle lead status update safely (bypassing triggers)
-- Used by the backend leads-handler.js

CREATE OR REPLACE FUNCTION public.handle_lead_status_update(
    p_lead_id uuid,
    p_status text,
    p_notes text,
    p_follow_up_at timestamptz,
    p_call_session_id text,
    p_summary_json jsonb,
    p_lost_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Run as owner (bypass RLS)
SET search_path = public
AS $$
DECLARE
    v_lead record;
    v_activity_id uuid;
    v_task_id uuid;
    v_org_id uuid;
    v_owner_id uuid;
BEGIN
    -- 1. Enable Admin Mode to bypass organization triggers
    PERFORM set_config('app.admin_mode', 'true', true);

    -- 2. Get Lead Details (for org_id and owner_id)
    SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
    
    IF v_lead IS NULL THEN
        RAISE EXCEPTION 'Lead not found';
    END IF;

    v_org_id := v_lead.org_id;
    v_owner_id := v_lead.owner_id;

    -- 3. Update Lead
    -- We map the statuses here or rely on the caller to pass usage formatted status?
    -- The caller passes DbStatus (Mapped), so we use p_status directly.
    UPDATE public.leads 
    SET 
        status = p_status,
        last_activity_at = now(),
        follow_up_at = CASE WHEN p_status = 'Negotiation' THEN p_follow_up_at ELSE follow_up_at END, -- Only set if follow_up (mapped to Negotiation?) - Logic from JS was status specific. 
        -- JS Logic was: if status === 'follow_up' (Negotiation) -> set follow_up_at
        -- But here we get the DB status.
        -- Let's trust the JS passed relevant params. 
        -- Actually, safer to just set if not null.
        -- follow_up_notes = p_notes, -- JS logic: if follow_up
        lost_reason = p_lost_reason,
        last_call_summary = COALESCE(p_summary_json, last_call_summary)
    WHERE id = p_lead_id;

    -- Update explicit columns based on basic logic if params provided
    IF p_follow_up_at IS NOT NULL THEN
         UPDATE public.leads SET follow_up_at = p_follow_up_at, follow_up_notes = p_notes WHERE id = p_lead_id;
    END IF;

    -- 4. Insert Activity
    INSERT INTO public.lead_activities (
        id, lead_id, org_id, type, data, call_session_id, created_at
    ) VALUES (
        uuid_generate_v4(),
        p_lead_id,
        v_org_id,
        p_status,
        jsonb_build_object(
            'followUpAt', p_follow_up_at,
            'notes', p_notes,
            'callSessionId', p_call_session_id,
            'summaryJson', p_summary_json,
            'lostReason', p_lost_reason
        ),
        p_call_session_id,
        now()
    ) RETURNING id INTO v_activity_id;

    -- 5. Create Task (Only if date provided)
    IF p_follow_up_at IS NOT NULL THEN
        -- Safety check for owner_id (Tasks require an owner)
        IF v_owner_id IS NULL THEN
             -- Try to find an owner in the same org (e.g., a manager or any user)
             SELECT id INTO v_owner_id FROM public.profiles WHERE organization_id = v_org_id LIMIT 1;
        END IF;

        IF v_owner_id IS NOT NULL THEN
            INSERT INTO public.tasks (
                id,
                owner_id,
                lead_id,
                organization_id, -- MUST set this
                title,
                type,
                status,
                priority,
                due_date,
                due_time,
                notes,
                ai_reason
            ) VALUES (
                uuid_generate_v4(),
                v_owner_id,
                p_lead_id,
                v_org_id,
                CASE WHEN p_notes IS NOT NULL AND length(p_notes) > 0 THEN 'המשך טיפול: ' || substring(p_notes from 1 for 30) ELSE 'שיחת המשך טיפול' END,
                'call',
                'open',
                'high',
                p_follow_up_at::date,
                p_follow_up_at::time,
                p_notes,
                'נוצר אוטומטית מסיכום שיחה'
            ) RETURNING id INTO v_task_id;
        END IF;
    END IF;

    -- Reset Admin Mode
    PERFORM set_config('app.admin_mode', 'false', true);

    RETURN jsonb_build_object(
        'success', true,
        'lead_id', p_lead_id,
        'activity_id', v_activity_id,
        'task_id', v_task_id
    );

EXCEPTION WHEN OTHERS THEN
    -- Reset Admin Mode in case of error
    PERFORM set_config('app.admin_mode', 'false', true);
    RAISE;
END;
$$;
