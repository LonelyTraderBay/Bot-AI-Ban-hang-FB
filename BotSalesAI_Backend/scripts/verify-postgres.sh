#!/usr/bin/env bash
set -euo pipefail

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

cleanup() {
    if [[ -n "$api_pid" ]]; then
        kill "$api_pid" 2>/dev/null || true
        wait "$api_pid" || true
    fi
    if [[ -n "$tls_dir" ]]; then
        rm -f "$tls_dir/local.crt" "$tls_dir/local.key"
        rmdir "$tls_dir"
    fi
    "${compose[@]}" down --volumes
}
trap cleanup EXIT

pg_query() {
    "${compose[@]}" exec -T postgres psql -X -U botsales_admin -d botsales_be_dev -Atc "$1"
}

"${compose[@]}" up -d --wait
test "$(pg_query 'SHOW server_version_num')" = 180007
test "$(pg_query "SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname = 'public'")" = 0

node apps/api/dist/main.js &
api_pid=$!
curl --retry 15 --retry-connrefused --retry-delay 1 --max-time 5 -fsS "$base/live"
test "$(curl -sS --max-time 5 -o /dev/null -w '%{http_code}' "$base/ready")" = 503

npm run db:migrate
npm run db:migrate
npm exec -- prisma migrate diff --from-config-datasource --to-schema apps/api/prisma/schema.prisma --exit-code
npm run db:seed
npm run test:postgres
curl -fsS --max-time 5 "$base/ready"

"${compose[@]}" stop postgres
test "$(curl -sS --max-time 5 -o /dev/null -w '%{http_code}' "$base/ready")" = 503
curl -fsS --max-time 5 "$base/live"
"${compose[@]}" up -d --wait
curl -fsS --max-time 5 "$base/ready"
test "$(pg_query 'SELECT count(*) FROM public.shops')" = 2

tls_dir=$(mktemp -d)
export APP_ORIGIN=https://localhost:5173 OIDC_ISSUER=https://127.0.0.1:9443 OIDC_CLIENT_ID=botsales-p0-dev
export OIDC_REDIRECT_URI="$APP_ORIGIN/api/v2/auth/callback"
export OIDC_CLIENT_SECRET="$(openssl rand -hex 32)" AUTH_SIGNING_KEY="$(openssl rand -hex 32)"
export P0_TLS_CERT_FILE="$tls_dir/local.crt" P0_TLS_KEY_FILE="$tls_dir/local.key"
openssl req -x509 -newkey rsa:2048 -noenc -days 1 -subj /CN=BotSales-P0-CI \
    -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1' -keyout "$P0_TLS_KEY_FILE" -out "$P0_TLS_CERT_FILE" 2>/dev/null
export NODE_EXTRA_CA_CERTS="$P0_TLS_CERT_FILE"
npm run test:oidc
npm run test:workspace
npm run test:catalog
npm run test:imports
npm run test:customers
npm run test:inventory
npm run test:orders
npm run test:finance
npm run test:events
npm run test:jobs
