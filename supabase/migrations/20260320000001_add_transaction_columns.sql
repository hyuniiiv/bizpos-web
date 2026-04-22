-- Migration: Add transaction columns for Beeple PG integration
-- Created: 2026-03-20
-- Description: Add user_name, tid, and cancelled_at columns to transactions table

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tid TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
