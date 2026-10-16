#!/usr/bin/env bash
# Runs the database tests against a throwaway local Postgres (15+).
#   ./supabase/tests/run.sh
# Needs postgres binaries on PATH (or PG_BIN=/usr/lib/postgresql/16/bin) and,
# when run as root, the `postgres` OS user.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
PG_BIN="${PG_BIN:-$(dirname "$(command -v initdb || echo /usr/lib/postgresql/16/bin/initdb)")}"
WORK="${PGTEST_DIR:-$(mktemp -d)}"
PORT="${PGTEST_PORT:-54329}"

run_as() { if [ "$(id -u)" = 0 ]; then su postgres -s /bin/bash -c "$*"; else bash -c "$*"; fi; }

mkdir -p "$WORK"
[ "$(id -u)" = 0 ] && chown postgres:postgres "$WORK"
chmod 755 "$WORK"

run_as "$PG_BIN/initdb -D '$WORK/data' -A trust -U postgres >/dev/null"
run_as "$PG_BIN/pg_ctl -D '$WORK/data' -o \"-p $PORT -k '$WORK' -c listen_addresses=''\" -l '$WORK/log' -w start >/dev/null"
trap 'run_as "$PG_BIN/pg_ctl -D '"'$WORK/data'"' -m immediate stop >/dev/null" || true' EXIT

PSQL=("$PG_BIN/psql" -h "$WORK" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -c "create database narrow" >/dev/null
for f in "$HERE/00_stub.sql" "$ROOT"/supabase/migrations/*.sql "$HERE/10_rules.sql" "$HERE/20_push.sql"; do
  echo "→ $(basename "$f")"
  # capture first so an empty output (a file with nothing to say) is not an error
  out="$("${PSQL[@]}" -d narrow -f "$f" 2>&1)" || { echo "$out"; echo "FAILED in $(basename "$f")"; exit 1; }
  # keep only the human-meaningful lines (test results and errors)
  echo "$out" | grep -E 'NOTICE|PASSED|ERROR|FAIL' | sed -e 's/^psql:[^ ]* //' -e 's/^NOTICE:  //' || true
done
echo "done"
