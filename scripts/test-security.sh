#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API="${API_URL:-http://localhost:5000/api}"
PASS=0
FAIL=0

check() {
  local name="$1"
  local result="$2"
  if [ "$result" = "pass" ]; then
    echo "  [PASS] $name"
    PASS=$((PASS + 1))
  else
    echo "  [FAIL] $name"
    FAIL=$((FAIL + 1))
  fi
}

echo "==> CUSTECH Security Test Suite"
echo "Target: $API"
echo ""

# Health check
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$API/health" 2>/dev/null || echo "000")
[ "$HTTP" = "200" ] && check "Health endpoint" "pass" || check "Health endpoint" "fail"

# Missing nonce rejected
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API/exams" -H "Authorization: Bearer invalid" 2>/dev/null || echo "000")
[ "$HTTP" = "400" ] || [ "$HTTP" = "401" ] && check "Nonce required on protected routes" "pass" || check "Nonce required on protected routes" "fail"

# Replay attack
NONCE="test-nonce-$(date +%s)"
TOKEN=""
HTTP1=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API/auth/me" -H "X-Request-Nonce: $NONCE" 2>/dev/null || echo "000")
HTTP2=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API/auth/me" -H "X-Request-Nonce: $NONCE" 2>/dev/null || echo "000")
[ "$HTTP2" = "409" ] && check "Replay nonce rejection" "pass" || check "Replay nonce rejection" "fail"

# Invalid manifest
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/sessions/verify-manifest" \
  -H "Content-Type: application/json" \
  -H "X-Request-Nonce: manifest-$(date +%s)" \
  -d '{"manifest":{"examId":"fake"},"signature":"invalid"}' 2>/dev/null || echo "000")
[ "$HTTP" = "401" ] || [ "$HTTP" = "403" ] && check "Manifest verification endpoint" "pass" || check "Manifest verification endpoint" "fail"

# Electron inspect blocked (documentation check)
if grep -q "disable-features.*DevTools" "$ROOT/electron-app/src/main/index.js" 2>/dev/null; then
  check "DevTools blocked in production config" "pass"
else
  check "DevTools blocked in production config" "fail"
fi

# Context isolation
if grep -q "contextIsolation: true" "$ROOT/electron-app/src/main/windowManager.js" 2>/dev/null; then
  check "Context isolation enabled" "pass"
else
  check "Context isolation enabled" "fail"
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
