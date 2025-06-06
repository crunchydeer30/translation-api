#!/bin/sh
set -e

echo "Entrypoint: Running database migrations (npx prisma migrate deploy)..."
npx prisma migrate deploy

echo "Entrypoint: Migrations deployment complete."
echo "Entrypoint: Starting application..."

exec "$@"