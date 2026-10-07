#!/bin/sh
set -e

API_DOMAIN="${INFISICAL_API_URL:-$INFISICAL_HOST_URL}"
ENV_TARGET="${INFISICAL_ENV}"
PROJECT_ID="${INFISICAL_PROJECT_ID}"
CLIENT_ID="${INFISICAL_CLIENT_ID:-$INFISICAL_UNIVERSAL_AUTH_CLIENT_ID}"
CLIENT_SECRET="${INFISICAL_CLIENT_SECRET:-$INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET}"
SECRET_PATH="${INFISICAL_SECRET_PATH}"

# Pastikan API_DOMAIN berakhiran /api jika diberikan
if [ -n "$API_DOMAIN" ]; then
    case "$API_DOMAIN" in
        */api) ;;
        *) API_DOMAIN="${API_DOMAIN%/}/api" ;;
    esac
fi

TOKEN="$INFISICAL_TOKEN"

# Login mesin headless menggunakan Universal Auth jika client credentials tersedia
if [ -z "$TOKEN" ] && [ -n "$CLIENT_ID" ] && [ -n "$CLIENT_SECRET" ]; then
    echo "[ENTRYPOINT] Melakukan autentikasi mesin ke Infisical via Universal Auth..."
    DOMAIN_ARG=""
    if [ -n "$API_DOMAIN" ]; then
        DOMAIN_ARG="--domain=$API_DOMAIN"
    fi
    TOKEN=$(infisical login --method=universal-auth --client-id="$CLIENT_ID" --client-secret="$CLIENT_SECRET" $DOMAIN_ARG --plain --silent 2>/dev/null || true)
fi

if [ -n "$TOKEN" ]; then
    echo "[ENTRYPOINT] Kredensial Infisical terdeteksi. Menginjeksi secrets ke aplikasi..."
    EXTRA_ARGS=""
    if [ -n "$API_DOMAIN" ]; then
        EXTRA_ARGS="$EXTRA_ARGS --domain=$API_DOMAIN"
    fi
    if [ -n "$ENV_TARGET" ]; then
        EXTRA_ARGS="$EXTRA_ARGS --env=$ENV_TARGET"
    fi
    if [ -n "$PROJECT_ID" ]; then
        EXTRA_ARGS="$EXTRA_ARGS --projectId=$PROJECT_ID"
    fi
    if [ -n "$SECRET_PATH" ]; then
        EXTRA_ARGS="$EXTRA_ARGS --path=$SECRET_PATH"
    fi
    exec infisical run --token="$TOKEN" $EXTRA_ARGS --silent -- "$@"
else
    echo "[ENTRYPOINT] Infisical credentials tidak terdeteksi, menjalankan aplikasi langsung dengan environment container..."
    exec "$@"
fi
