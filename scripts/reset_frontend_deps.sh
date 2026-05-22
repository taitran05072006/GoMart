#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo "Stopping Vite (if running)..."
pkill -f "vite" >/dev/null 2>&1 || true

echo "Cleaning frontend caches and modules..."
rm -rf "$FRONTEND_DIR/node_modules" "$FRONTEND_DIR/.vite" "$FRONTEND_DIR/dist"

echo "Reinstalling dependencies with lockfile..."
npm --prefix "$FRONTEND_DIR" ci

echo "Verifying sucrase/tailwind modules..."
node -e "require('./frontend/node_modules/sucrase/dist/parser/tokenizer'); console.log('sucrase-tokenizer-ok')"
node -e "require('./frontend/node_modules/tailwindcss/lib/plugin.js'); console.log('tailwind-plugin-ok')"

echo "Done. Start app with: npm --prefix frontend run dev"
