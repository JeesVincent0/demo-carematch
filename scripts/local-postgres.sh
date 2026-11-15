#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
CARE_PG_BIN="${CARE_PG_BIN:-/usr/lib/postgresql/16/bin}"
CARE_PG_PORT="${CARE_PG_PORT:-54329}"
mkdir -p .local/postgres .local/pg-socket
if [ ! -f .local/postgres/PG_VERSION ]; then
  "$CARE_PG_BIN/initdb" -D .local/postgres -A trust --no-locale --encoding=UTF8
fi
if ! "$CARE_PG_BIN/pg_ctl" -D .local/postgres status >/dev/null 2>&1; then
  "$CARE_PG_BIN/pg_ctl" -D .local/postgres -l .local/postgres.log -o "-p $CARE_PG_PORT -k $(pwd)/.local/pg-socket -h 127.0.0.1" start
fi
if ! "$CARE_PG_BIN/psql" -h 127.0.0.1 -p "$CARE_PG_PORT" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='carematch'" | grep -q 1; then
  "$CARE_PG_BIN/createdb" -h 127.0.0.1 -p "$CARE_PG_PORT" carematch
fi
printf 'Local development PostgreSQL is ready on port %s. Set DATABASE_URL using your OS username and database carematch.\n' "$CARE_PG_PORT"
