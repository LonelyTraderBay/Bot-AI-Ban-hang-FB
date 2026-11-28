CREATE TABLE conversation_order_drafts (
    shop_id UUID NOT NULL,
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'discarded', 'converted')),
    version INTEGER NOT NULL DEFAULT 1,
    "values" JSONB,
    created_at TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    saved_at TIMESTAMPTZ(3),
    edit_epoch INTEGER NOT NULL DEFAULT 0,
    edit_session_id UUID,
    edit_tab_id UUID,
    edit_generation INTEGER,
    edit_permission_version INTEGER,
    edit_expires_at TIMESTAMPTZ(3),
    PRIMARY KEY (shop_id, id),
    CONSTRAINT conversation_order_drafts_conversation_fk FOREIGN KEY (shop_id, customer_id, conversation_id)
        REFERENCES channel_conversations(shop_id, customer_id, id) ON DELETE RESTRICT ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX conversation_order_drafts_active_idx
    ON conversation_order_drafts (shop_id, conversation_id) WHERE state = 'active';
CREATE INDEX conversation_order_drafts_list_idx
    ON conversation_order_drafts (shop_id, state, created_at, id);
CREATE INDEX conversation_order_drafts_customer_idx
    ON conversation_order_drafts (shop_id, customer_id);

GRANT SELECT, INSERT, UPDATE ON conversation_order_drafts TO botsales_runtime;
