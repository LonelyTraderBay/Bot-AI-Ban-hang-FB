ALTER TABLE channel_conversations ADD COLUMN last_inbound_while_closed BOOLEAN NOT NULL DEFAULT false;
