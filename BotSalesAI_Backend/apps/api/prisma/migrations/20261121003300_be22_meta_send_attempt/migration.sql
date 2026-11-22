ALTER TABLE message_dispatches
    ADD COLUMN started_at TIMESTAMPTZ(3),
    ADD CONSTRAINT message_dispatch_start_before_finish CHECK (
        started_at IS NULL OR finished_at IS NULL OR started_at <= finished_at
    );
