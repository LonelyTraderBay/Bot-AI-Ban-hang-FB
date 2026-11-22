BEGIN;

CREATE TABLE "auth_login_attempts" (
    "state" VARCHAR(43) NOT NULL,
    "browser_hash" VARCHAR(64) NOT NULL,
    "idempotency_key_hash" VARCHAR(64) NOT NULL,
    "return_to" TEXT NOT NULL,
    "return_to_hash" VARCHAR(64) NOT NULL,
    "nonce" VARCHAR(43),
    "pkce_verifier" VARCHAR(128),
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "consumed_at" TIMESTAMPTZ(3),
    CONSTRAINT "auth_login_attempts_pkey" PRIMARY KEY ("state"),
    CONSTRAINT "auth_login_attempts_consumption" CHECK (
        ("consumed_at" IS NULL AND "nonce" IS NOT NULL AND "pkce_verifier" IS NOT NULL)
        OR ("consumed_at" IS NOT NULL AND "nonce" IS NULL AND "pkce_verifier" IS NULL)
    )
);
CREATE UNIQUE INDEX "auth_login_attempts_browser_hash_idempotency_key_hash_key"
    ON "auth_login_attempts" ("browser_hash", "idempotency_key_hash");
CREATE INDEX "auth_login_attempts_expires_at_idx" ON "auth_login_attempts" ("expires_at");
GRANT SELECT, INSERT, UPDATE, DELETE ON "auth_login_attempts" TO botsales_runtime;

COMMIT;
