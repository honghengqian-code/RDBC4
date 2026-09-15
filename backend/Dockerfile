# Django 5.1 requires Python >= 3.10, so this uses 3.11-slim rather than the
# python:3.9-slim in the brief — 3.9 can't import this project's Django version.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=myproject.settings

WORKDIR /app

# libpq5 covers psycopg2-binary's runtime needs; curl backs the entrypoint's
# readiness checks against dependent services.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x docker-entrypoint.sh \
    && addgroup --system app \
    && adduser --system --ingroup app app \
    && mkdir -p /app/staticfiles /app/media /app/logs \
    && chown -R app:app /app

USER app

EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]
# Overridden by docker-compose for the celery service.
CMD ["gunicorn", "myproject.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", \
     "--access-logfile", "-", "--error-logfile", "-"]
