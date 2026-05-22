#!/usr/bin/env bash
set -euo pipefail

API_BASE=${API_BASE:-http://localhost:8080/api}

show_help() {
  cat <<EOF
Usage:
  $0 --user USER_ID --product PRODUCT_ID [--qty QUANTITY] [--address ADDRESS] [--name RECIPIENT_NAME] [--phone RECIPIENT_PHONE]

Example:
  $0 --user 1 --product 2 --qty 1 --address "Da Nang" --name "Test User" --phone "0900000000"
EOF
  exit 1
}

USER_ID=""
PRODUCT_ID=""
QTY=1
ADDRESS="Da Nang"
RECIPIENT_NAME="Test User"
RECIPIENT_PHONE="0900000000"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --user) USER_ID="$2"; shift 2 ;;
    --product) PRODUCT_ID="$2"; shift 2 ;;
    --qty) QTY="$2"; shift 2 ;;
    --address) ADDRESS="$2"; shift 2 ;;
    --name) RECIPIENT_NAME="$2"; shift 2 ;;
    --phone) RECIPIENT_PHONE="$2"; shift 2 ;;
    -h|--help) show_help ;;
    *) echo "Unknown arg: $1"; show_help ;;
  esac
done

if [[ -z "$USER_ID" || -z "$PRODUCT_ID" ]]; then
  show_help
fi

echo "1) Creating order..."
ORDER_REQ=$(jq -n \
  --argjson userId "$USER_ID" \
  --argjson productId "$PRODUCT_ID" \
  --argjson qty "$QTY" \
  --arg address "$ADDRESS" \
  --arg recipientName "$RECIPIENT_NAME" \
  --arg recipientPhone "$RECIPIENT_PHONE" \
  '{
    userId: $userId,
    items: [{ productId: $productId, quantity: $qty }],
    shippingAddress: $address,
    recipientName: $recipientName,
    recipientPhone: $recipientPhone
  }')

ORDER_RESP=$(curl -sS -X POST "$API_BASE/orders" \
  -H "Content-Type: application/json" \
  -d "$ORDER_REQ")
ORDER_ID=$(echo "$ORDER_RESP" | jq -r '.data.id // .id // empty')

if [[ -z "$ORDER_ID" ]]; then
  echo "Create order failed:"
  echo "$ORDER_RESP" | jq '.'
  exit 2
fi
echo "   Order created: $ORDER_ID"

echo "2) Creating BANK_TRANSFER payment..."
PAY_RESP=$(curl -sS -X POST "$API_BASE/orders/$ORDER_ID/payment" \
  -H "Content-Type: application/json" \
  -d '{"method":"BANK_TRANSFER"}')

TX_CODE=$(echo "$PAY_RESP" | jq -r '.data.transactionCode // .transactionCode // empty')
AMOUNT=$(echo "$PAY_RESP" | jq -r '.data.amount // .amount // empty')

if [[ -z "$TX_CODE" || -z "$AMOUNT" ]]; then
  echo "Create payment failed:"
  echo "$PAY_RESP" | jq '.'
  exit 3
fi
echo "   Payment created: tx=$TX_CODE amount=$AMOUNT"

echo "3) Simulating webhook PAID..."
"$(dirname "$0")/simulate_webhook.sh" --transaction "$TX_CODE" --amount "$AMOUNT"

echo "4) Verifying payment status..."
FINAL=$(curl -sS "$API_BASE/orders/$ORDER_ID/payment")
STATUS=$(echo "$FINAL" | jq -r '.data.status // .status // empty')
ORDER_STATUS=$(curl -sS "$API_BASE/orders/$ORDER_ID" | jq -r '.data.status // .status // empty')

echo "   Payment status: $STATUS"
echo "   Order status:   $ORDER_STATUS"
echo "   Order ID:       $ORDER_ID"

if [[ "$STATUS" != "PAID" ]]; then
  echo "E2E transfer test failed: payment is not PAID"
  exit 4
fi

echo "E2E transfer test success."
