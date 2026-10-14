#!/bin/sh
# Container entrypoint.
# With DEMO_SEED=true, a brand-new deployment is filled with the demo content:
#   - the database is restored from demo/drsaleh.dump when it has no tables yet
#     (the dump already records every Prisma migration as applied);
#   - demo images and files are unpacked into uploads/ once.
# Without DEMO_SEED nothing is touched and the API just starts.
set -e

if [ "$DEMO_SEED" = "true" ]; then
  DB_URL="${DATABASE_URL%%\?*}"
  if [ "$(psql "$DB_URL" -Atc "select to_regclass('public.users') is not null")" != "t" ]; then
    echo "[start] empty database: restoring demo data"
    pg_restore --no-owner --no-acl -d "$DB_URL" demo/drsaleh.dump
  fi
  if [ ! -f uploads/.demo-loaded ]; then
    echo "[start] unpacking demo uploads"
    mkdir -p uploads
    tar xzf demo/uploads.tgz -C .
    touch uploads/.demo-loaded
  fi
fi

exec node dist/src/main.js
