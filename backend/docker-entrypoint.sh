#!/bin/sh
# Waits for Postgres, then (for the web process only — see DJANGO_MANAGE)
# applies migrations and collects static files before handing off to CMD.
set -e

python - <<'PY'
import os
import sys
import time

import psycopg2

host = os.environ.get("POSTGRES_HOST", "postgres")
port = os.environ.get("POSTGRES_PORT", "5432")
name = os.environ.get("POSTGRES_DB", "jobboard")
user = os.environ.get("POSTGRES_USER", "jobboard")
password = os.environ.get("POSTGRES_PASSWORD", "jobboard")

for attempt in range(30):
    try:
        psycopg2.connect(host=host, port=port, dbname=name, user=user, password=password).close()
        break
    except psycopg2.OperationalError:
        print(f"Waiting for Postgres at {host}:{port} ({attempt + 1}/30)...", file=sys.stderr)
        time.sleep(2)
else:
    print("Postgres never became available.", file=sys.stderr)
    sys.exit(1)
PY

# Only one process should run migrations — the celery service sets
# DJANGO_MANAGE=0 so it doesn't race the web process on startup.
if [ "${DJANGO_MANAGE:-1}" = "1" ]; then
    python manage.py migrate --noinput
    python manage.py collectstatic --noinput
fi

exec "$@"
