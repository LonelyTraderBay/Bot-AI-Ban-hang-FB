ALTER TABLE auth_login_attempts
    ADD COLUMN step_up_session_id UUID,
    ADD COLUMN step_up_shop_id UUID,
    ADD COLUMN step_up_resource_id UUID,
    ADD CONSTRAINT auth_login_attempt_step_up_scope CHECK (
        num_nonnulls(step_up_session_id, step_up_shop_id, step_up_resource_id) IN (0, 3)
    );

ALTER TABLE step_up_grants
    ADD COLUMN revealed_at TIMESTAMPTZ(3),
    ADD COLUMN shop_id UUID,
    ADD COLUMN resource_id UUID,
    ADD CONSTRAINT step_up_grant_scope CHECK (num_nonnulls(shop_id, resource_id) IN (0, 2));
