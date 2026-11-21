BEGIN;

ALTER TABLE "users"
    ALTER COLUMN "oidc_issuer" DROP NOT NULL,
    ALTER COLUMN "oidc_subject" DROP NOT NULL,
    ADD CONSTRAINT "users_oidc_identity_pair" CHECK (
        ("oidc_issuer" IS NULL) = ("oidc_subject" IS NULL)
    );

ALTER TABLE "memberships"
    ADD COLUMN "invite_issuer" TEXT,
    ADD COLUMN "invite_email_hash" VARCHAR(64),
    ADD COLUMN "invite_expires_at" TIMESTAMPTZ(3),
    ADD CONSTRAINT "memberships_invite_lifecycle" CHECK (
        ("invite_issuer" IS NULL AND "invite_email_hash" IS NULL AND "invite_expires_at" IS NULL)
        OR (
            "status" = 'invited'
            AND "invite_issuer" IS NOT NULL
            AND "invite_email_hash" IS NOT NULL
            AND "invite_email_hash" ~ '^[a-f0-9]{64}$'
            AND "invite_expires_at" IS NOT NULL
        )
    );

CREATE UNIQUE INDEX "memberships_shop_id_invite_issuer_invite_email_hash_key"
    ON "memberships" ("shop_id", "invite_issuer", "invite_email_hash");
CREATE INDEX "memberships_invite_lookup_idx"
    ON "memberships" ("invite_issuer", "invite_email_hash", "invite_expires_at");

COMMIT;
