#!/usr/bin/env bash
set -euo pipefail

release=
if (( $# )); then
    if [[ $# -ne 3 || "$1" != --release || ! "$3" =~ ^[0-9a-f]{64}$ ]]; then
        printf 'Usage: verify-postgres.sh [--release <installed-release> <manifest-sha256>]\n' >&2
        exit 1
    fi
    release=$(realpath "$2")
    printf '%s  %s\n' "$3" "$release/release-manifest.json" | sha256sum --check --strict >&2
    node scripts/package-release.mjs --verify "$release" --installed >&2
fi

project="botsales-be-$(node -p "require('node:crypto').randomBytes(8).toString('hex')")"
compose=(docker compose --project-name "$project" --file infra/p0/compose.yml)
export BOTSALES_DB_ADMIN_PASSWORD="$(openssl rand -hex 24)"
export BOTSALES_DB_MIGRATION_PASSWORD="$(openssl rand -hex 24)"
export BOTSALES_DB_RUNTIME_PASSWORD="$(openssl rand -hex 24)"
export MIGRATION_DATABASE_URL="postgresql://botsales_migrator:$BOTSALES_DB_MIGRATION_PASSWORD@127.0.0.1:55432/botsales_be_dev"
export DATABASE_URL="postgresql://botsales_runtime:$BOTSALES_DB_RUNTIME_PASSWORD@127.0.0.1:55432/botsales_be_dev"
export REDIS_URL="redis://127.0.0.1:56379"
export API_BIND=127.0.0.1 API_PORT=55433
base="http://$API_BIND:$API_PORT/api/v2/health"
api_pid=
tls_dir=
release_migration=

cleanup() {
    if [[ -n "$api_pid" ]]; then
        kill "$api_pid" 2>/dev/null || true
        wait "$api_pid" || true
    fi
    if [[ -n "$tls_dir" ]]; then
        rm -f "$tls_dir/local.crt" "$tls_dir/local.key"
        rmdir "$tls_dir"
    fi
    if [[ -n "$release_migration" ]]; then
        rm -rf -- "$release_migration"
    fi
    "${compose[@]}" down --volumes >&2
}
trap cleanup EXIT

pg_query() {
    "${compose[@]}" exec -T postgres psql -X -U botsales_admin -d botsales_be_dev -Atc "$1"
}

configure_tls() {
    tls_dir=$(mktemp -d)
    export APP_ORIGIN=https://localhost:5173 OIDC_ISSUER=https://127.0.0.1:9443 OIDC_CLIENT_ID=botsales-p0-dev
    export OIDC_REDIRECT_URI="$APP_ORIGIN/api/v2/auth/callback"
    export OIDC_CLIENT_SECRET="$(openssl rand -hex 32)" AUTH_SIGNING_KEY="$(openssl rand -hex 32)"
    export P0_TLS_CERT_FILE="$tls_dir/local.crt" P0_TLS_KEY_FILE="$tls_dir/local.key"
    openssl req -x509 -newkey rsa:2048 -noenc -days 1 -subj /CN=BotSales-P0-CI \
        -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1' -keyout "$P0_TLS_KEY_FILE" -out "$P0_TLS_CERT_FILE" 2>/dev/null
    export NODE_EXTRA_CA_CERTS="$P0_TLS_CERT_FILE"
}

migrate_release_fixture() {
    local runtime="$release/BotSalesAI_Backend"
    release_migration=$(mktemp -d)
    mkdir -p "$release_migration/apps/api"
    cp -- "$runtime/prisma.config.ts" "$release_migration/prisma.config.ts"
    cp -R -- "$runtime/apps/api/prisma" "$release_migration/apps/api/prisma"
    ln -s "$PWD/node_modules" "$release_migration/node_modules"
    node_modules/.bin/prisma migrate deploy --config "$release_migration/prisma.config.ts"
}

"${compose[@]}" up -d --wait >&2
test "$(pg_query 'SHOW server_version_num')" = 180007
test "$(pg_query "SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname = 'public'")" = 0

if [[ -n "$release" ]]; then
    migrate_release_fixture >&2
    npm run db:seed >&2
    configure_tls
    node tests/integration/auth/browser-smoke.mjs --release "$release" "$3" --http-only
    exit 0
fi

node apps/api/dist/main.js &
api_pid=$!
curl --retry 15 --retry-connrefused --retry-delay 1 --max-time 5 -fsS "$base/live"
test "$(curl -sS --max-time 5 -o /dev/null -w '%{http_code}' "$base/ready")" = 503

npm run db:migrate
npm run db:migrate
npm exec -- prisma migrate diff --from-config-datasource --to-schema apps/api/prisma/schema.prisma --exit-code
npm run db:seed
npm run test:postgres
npm run check:staging-data -- --fixture
curl -fsS --max-time 5 "$base/ready"

"${compose[@]}" stop postgres
test "$(curl -sS --max-time 5 -o /dev/null -w '%{http_code}' "$base/ready")" = 503
curl -fsS --max-time 5 "$base/live"
"${compose[@]}" up -d --wait
curl -fsS --max-time 5 "$base/ready"
test "$(pg_query 'SELECT count(*) FROM public.shops')" = 2

configure_tls
npm run test:oidc
npm run test:workspace
# The SSE cases check consecutive sequence numbers and an empty initial outbox.
# Run them before the business suites generate unrelated work for both shops.
npm run test:events
mkdir -p test-results/backend
bash scripts/verify-object-storage.sh 2>&1 | tee test-results/backend/object-storage-ci.txt
npm run test:catalog
npm run test:imports
npm run test:customers
npm run test:inventory
npm run test:orders
npm run test:finance
npm run test:procurement
npm run test:inbox
npm run test:ai
npm run test:operations
npm run test:jobs
npm run test:privacy
