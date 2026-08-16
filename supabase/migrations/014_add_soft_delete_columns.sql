-- ============================================================
-- Migration 014: Add deleted_at and status columns for soft delete
-- ============================================================

ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON public.users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
