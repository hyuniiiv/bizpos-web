-- Migration: Add contact_email column to merchants
-- Created: 2026-03-24
-- Description: Add contact_email column matching schema.sql definition

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS contact_email text;
