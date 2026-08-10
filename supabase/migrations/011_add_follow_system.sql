-- ============================================================
-- Migration 011: Social Follow System
-- ============================================================
-- Depends on: public.users (from base migration)
--             username column (from migration 010)
-- Does NOT modify migration 010 or the username system.
-- ============================================================

-- ── 1. follow_requests ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.follow_requests (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at  TIMESTAMPTZ,

    -- No self-follow
    CONSTRAINT no_self_follow_request CHECK (requester_id <> recipient_id),

    -- One active request per pair (prevents duplicate requests)
    CONSTRAINT unique_follow_request UNIQUE (requester_id, recipient_id)
);

-- ── 2. follows ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.follows (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- No self-follow at DB level
    CONSTRAINT no_self_follow CHECK (follower_id <> following_id),

    -- A user can only follow another user once
    CONSTRAINT unique_follow UNIQUE (follower_id, following_id)
);

-- ── 3. Indexes ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_follow_requests_requester ON public.follow_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_follow_requests_recipient ON public.follow_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_follow_requests_status    ON public.follow_requests(status);

CREATE INDEX IF NOT EXISTS idx_follows_follower  ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);

-- ── 4. Enable Row Level Security ─────────────────────────────

ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows          ENABLE ROW LEVEL SECURITY;

-- ── 5. RLS Policies: follow_requests ─────────────────────────

-- Requester can create a request (DB constraint ensures requester_id = auth.uid())
CREATE POLICY "follow_requests_insert"
    ON public.follow_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (requester_id = auth.uid());

-- Both parties can see requests involving themselves
CREATE POLICY "follow_requests_select"
    ON public.follow_requests
    FOR SELECT
    TO authenticated
    USING (requester_id = auth.uid() OR recipient_id = auth.uid());

-- Only the RECIPIENT can update (accept/reject) — requester cannot touch status
CREATE POLICY "follow_requests_update"
    ON public.follow_requests
    FOR UPDATE
    TO authenticated
    USING (recipient_id = auth.uid())
    WITH CHECK (recipient_id = auth.uid());

-- Requester can delete (cancel) their own pending request
CREATE POLICY "follow_requests_delete"
    ON public.follow_requests
    FOR DELETE
    TO authenticated
    USING (requester_id = auth.uid());

-- ── 6. RLS Policies: follows ─────────────────────────────────

-- SELECT is public to authenticated users (follow counts / lists are social info)
CREATE POLICY "follows_select"
    ON public.follows
    FOR SELECT
    TO authenticated
    USING (true);

-- IMPORTANT: No INSERT policy for authenticated users.
-- Rows are ONLY inserted by the accept_follow_request() SECURITY DEFINER RPC below.
-- This prevents any client from forging a follow relationship.

-- A user can only unfollow themselves (delete their own following relationship)
CREATE POLICY "follows_delete"
    ON public.follows
    FOR DELETE
    TO authenticated
    USING (follower_id = auth.uid());

-- ── 7. accept_follow_request() — SECURITY DEFINER RPC ────────
--
-- This function runs with the privileges of the function owner (postgres/service role),
-- bypassing RLS. It performs the full acceptance in a single atomic transaction:
--   1. Lock + verify the request exists
--   2. Verify auth.uid() is the recipient
--   3. Verify status is still 'pending'
--   4. Update status → 'accepted'
--   5. Insert the follow relationship
--
-- Returns TRUE on success, raises EXCEPTION on any violation.

CREATE OR REPLACE FUNCTION public.accept_follow_request(p_request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_requester_id UUID;
    v_recipient_id UUID;
    v_status       TEXT;
BEGIN
    -- Lock the request row for the duration of this transaction
    SELECT requester_id, recipient_id, status
    INTO   v_requester_id, v_recipient_id, v_status
    FROM   public.follow_requests
    WHERE  id = p_request_id
    FOR UPDATE;

    -- 1. Request must exist
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Follow request % not found', p_request_id;
    END IF;

    -- 2. Caller must be the recipient
    IF v_recipient_id <> auth.uid() THEN
        RAISE EXCEPTION 'Only the recipient can accept a follow request';
    END IF;

    -- 3. Must still be pending
    IF v_status <> 'pending' THEN
        RAISE EXCEPTION 'Follow request is not pending (status: %)', v_status;
    END IF;

    -- 4. Update the request status
    UPDATE public.follow_requests
    SET    status       = 'accepted',
           responded_at = NOW()
    WHERE  id = p_request_id;

    -- 5. Insert the follow relationship (ON CONFLICT DO NOTHING handles race conditions)
    INSERT INTO public.follows (follower_id, following_id)
    VALUES (v_requester_id, v_recipient_id)
    ON CONFLICT (follower_id, following_id) DO NOTHING;

    RETURN TRUE;
END;
$$;

-- Grant to authenticated users
GRANT EXECUTE ON FUNCTION public.accept_follow_request(UUID) TO authenticated;

-- ── 8. search_users_by_username() — SECURITY DEFINER RPC ─────
--
-- Returns ONLY public-safe fields: id, username, name.
-- Excludes the calling user from results.
-- Case-insensitive search on username prefix/contains.

CREATE OR REPLACE FUNCTION public.search_users_by_username(p_query TEXT)
RETURNS TABLE (
    id       UUID,
    username TEXT,
    name     TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_clean TEXT;
BEGIN
    -- Strip leading @ if the user typed @username
    v_clean := LOWER(TRIM(LEADING '@' FROM TRIM(p_query)));

    IF v_clean = '' THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT  u.id,
            u.username,
            u.name
    FROM    public.users u
    WHERE   u.username IS NOT NULL
      AND   LOWER(u.username) LIKE (v_clean || '%')
      AND   u.id <> auth.uid()   -- Exclude current user
    ORDER BY LOWER(u.username)
    LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_users_by_username(TEXT) TO authenticated;

-- ── 9. reject_follow_request() — SECURITY DEFINER RPC ────────
--
-- Atomically verifies caller = recipient, status = pending, then sets rejected.

CREATE OR REPLACE FUNCTION public.reject_follow_request(p_request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_recipient_id UUID;
    v_status       TEXT;
BEGIN
    SELECT recipient_id, status
    INTO   v_recipient_id, v_status
    FROM   public.follow_requests
    WHERE  id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Follow request % not found', p_request_id;
    END IF;

    IF v_recipient_id <> auth.uid() THEN
        RAISE EXCEPTION 'Only the recipient can reject a follow request';
    END IF;

    IF v_status <> 'pending' THEN
        RAISE EXCEPTION 'Follow request is not pending (status: %)', v_status;
    END IF;

    UPDATE public.follow_requests
    SET    status       = 'rejected',
           responded_at = NOW()
    WHERE  id = p_request_id;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_follow_request(UUID) TO authenticated;
