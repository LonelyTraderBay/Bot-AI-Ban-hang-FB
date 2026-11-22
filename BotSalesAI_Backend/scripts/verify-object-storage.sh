#!/usr/bin/env bash
set -euo pipefail

fixture=$(mktemp -d "${TMPDIR:-/tmp}/botsales-s3-ci.XXXXXX")
store_pid=
cleanup() {
    if [[ -n "$store_pid" ]]; then
        kill -TERM "$store_pid" 2>/dev/null || true
        wait "$store_pid" || true
    fi
    rm -rf -- "$fixture"
}
trap cleanup EXIT

test "$(uname -s)-$(uname -m)" = Linux-x86_64
test -z "$(ss -H -ltn 'sport = :28333 or sport = :29333 or sport = :29340 or sport = :28888')"
curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' \
    --connect-timeout 10 --max-time 120 --retry 2 \
    https://github.com/seaweedfs/seaweedfs/releases/download/4.54/linux_amd64.tar.gz -o "$fixture/seaweed.tgz"
printf 'e7424a82eee327809bfa449fda4924c9a0f42f6669a01288eebb1b79674c8196  %s\n' "$fixture/seaweed.tgz" | sha256sum --check --strict
tar -xzf "$fixture/seaweed.tgz" -C "$fixture" weed
mkdir "$fixture/data"

export FILE_OBJECT_STORE_ENDPOINT=http://127.0.0.1:28333 FILE_OBJECT_STORE_REGION=us-east-1
export FILE_OBJECT_STORE_BUCKET=botsales-file-fixture OBJECT_STORE_FIXTURE_ADAPTER=1
export FILE_OBJECT_STORE_ACCESS_KEY_ID="fixture-$(openssl rand -hex 10)"
export FILE_OBJECT_STORE_SECRET_ACCESS_KEY="$(openssl rand -hex 24)" FILE_OBJECT_STORE_SESSION_TOKEN=
cat > "$fixture/s3.json" <<JSON
{"identities":[{"name":"ci-fixture","credentials":[{"accessKey":"$FILE_OBJECT_STORE_ACCESS_KEY_ID","secretKey":"$FILE_OBJECT_STORE_SECRET_ACCESS_KEY"}],"actions":["Read","Write","List"]}]}
JSON

(
    cd "$fixture"
    exec ./weed mini -dir="$fixture/data" -ip=127.0.0.1 -ip.bind=127.0.0.1 -bucket="$FILE_OBJECT_STORE_BUCKET" \
        -s3.config="$fixture/s3.json" -s3.port=28333 -master.port=29333 -volume.port=29340 -filer.port=28888 \
        -admin.ui=false -admin.port.legacy=0 -webdav=false -s3.port.iceberg=0 -s3.port.lance=0 -master.telemetry=false
) > "$fixture/seaweed.log" 2>&1 &
store_pid=$!

store_ready() {
    local s3_status master_status
    s3_status=$(curl -s --max-time 2 -o /dev/null -w '%{http_code}' "$FILE_OBJECT_STORE_ENDPOINT/") || return 1
    [[ "$s3_status" == 403 ]] || return 1
    # For an absent volume SeaweedFS 4.54 returns 503 during leader warmup, then 404.
    master_status=$(curl -s --max-time 2 -o "$fixture/lookup.json" -w '%{http_code}' \
        'http://127.0.0.1:29333/dir/lookup?volumeId=4294967295') || return 1
    [[ "$master_status" == 404 ]] && grep -Fq 'volume id 4294967295 not found' "$fixture/lookup.json"
}

deadline=$((SECONDS + 60))
until store_ready; do
    if ! kill -0 "$store_pid" 2>/dev/null || (( SECONDS >= deadline )); then
        printf 'SeaweedFS fixture did not reach private S3 and topology readiness.\n' >&2
        exit 1
    fi
    sleep 1
done
printf 'SeaweedFS 4.54 fixture has completed topology warmup.\n'
npm run test:object-storage
