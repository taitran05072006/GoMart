#!/usr/bin/env bash
# Simulate a Payo webhook to mark a payment as PAID
# Usage:
#   ./scripts/simulate_webhook.sh --transaction TX12345 --amount 120000
#   or
#   ./scripts/simulate_webhook.sh --order 42 --amount 120000

set -euo pipefail

API_BASE=${API_BASE:-http://localhost:8080/api}

show_help() {
  echo "Usage: $0 (--transaction TRANSACTION_CODE | --order ORDER_ID) --amount AMOUNT [--provider REF]"
  exit 1
}

TRANSACTION=""
ORDER_ID=""
AMOUNT=""
PROVIDER_REF="sim-ref-$(date +%s)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --transaction) TRANSACTION="$2"; shift 2 ;;
    --order) ORDER_ID="$2"; shift 2 ;;
    --amount) AMOUNT="$2"; shift 2 ;;
    --provider) PROVIDER_REF="$2"; shift 2 ;;
    -h|--help) show_help ;;
    *) echo "Unknown arg: $1"; show_help ;;
  esac
done

if [[ -z "$TRANSACTION" && -z "$ORDER_ID" ]]; then
  echo "Provide either --transaction or --order"; show_help
fi

if [[ -z "$AMOUNT" ]]; then
  echo "--amount is required"; show_help
fi

if [[ -n "$ORDER_ID" && -z "$TRANSACTION" ]]; then
  echo "Fetching payment for order $ORDER_ID to obtain transactionCode..."
  PAY_JSON=$(curl -s "$API_BASE/orders/$ORDER_ID/payment")
  TRANSACTION=$(echo "$PAY_JSON" | jq -r '.transactionCode // .data.transactionCode // empty')
  if [[ -z "$TRANSACTION" ]]; then
    echo "Could not determine transactionCode from payment response:" >&2
    echo "$PAY_JSON" >&2
    exit 2
  fi
  echo "Found transactionCode=$TRANSACTION"
fi

WEBHOOK_PAYLOAD=$(jq -n --arg tx "$TRANSACTION" --arg status "PAID" --arg prov "PAYO" --arg ref "$PROVIDER_REF" --argjson amount "$AMOUNT" '{transactionCode: $tx, status: $status, provider: $prov, providerReference: $ref, amount: $amount}')

echo "Sending webhook to $API_BASE/payments/webhook/payo with payload:" >&2
echo "$WEBHOOK_PAYLOAD" | jq '.' >&2

resp=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "$API_BASE/payments/webhook/payo" -H "Content-Type: application/json" -d "$WEBHOOK_PAYLOAD")
echo "$resp" | sed -n '1,200p'

echo "Done. Check GET $API_BASE/orders/{orderId}/payment for updated status."
