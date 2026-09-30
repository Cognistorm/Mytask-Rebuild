#!/bin/sh
# Runs once, when the local database volume is first created. Adds <POSTGRES_DB>_test for integration
# tests, so `pnpm test` never touches the development data.
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
CREATE DATABASE "${POSTGRES_DB}_test" OWNER "$POSTGRES_USER";
SQL
