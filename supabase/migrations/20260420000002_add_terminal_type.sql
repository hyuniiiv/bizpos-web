ALTER TABLE terminals
  ADD COLUMN IF NOT EXISTS terminal_type text NOT NULL DEFAULT 'pos'
  CHECK (terminal_type IN ('ticket_checker', 'pos', 'kiosk', 'table_order'));
