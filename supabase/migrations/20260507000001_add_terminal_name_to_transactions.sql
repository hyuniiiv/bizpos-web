ALTER TABLE transactions ADD COLUMN IF NOT EXISTS terminal_name text NOT NULL DEFAULT '';
