#!/usr/bin/env bash
##
## setup-pactflow.sh
##
## Initialises the PactFlow workspace for the Booking mobile contract testing demo.
## Run this once before pushing the first contracts.
##
## Usage:
##   export PACT_BROKER_BASE_URL=https://smart-bank.pactflow.io
##   export PACT_BROKER_TOKEN=8kYVEoQGySnnKZgRTewjyw
##   bash scripts/setup-pactflow.sh
##

set -euo pipefail

: "${PACT_BROKER_BASE_URL:?PACT_BROKER_BASE_URL must be set}"
: "${PACT_BROKER_TOKEN:?PACT_BROKER_TOKEN must be set}"

BROKER_ARGS="--broker-base-url ${PACT_BROKER_BASE_URL} --broker-token ${PACT_BROKER_TOKEN}"
REPO_URL="https://github.com/booking-com/booking-mobile-contract-testing-examples"

echo ""
echo "=== Booking Mobile Contract Testing — PactFlow Setup ==="
echo "Broker: ${PACT_BROKER_BASE_URL}"
echo ""

# ─── 1. Environments ──────────────────────────────────────────────────────────

echo "Creating environments..."

# production — the environment can-i-deploy checks against by default
curl -s -X POST "${PACT_BROKER_BASE_URL}/environments" \
  -H "Authorization: Bearer ${PACT_BROKER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name":"production","displayName":"Production","production":true}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('  ✓ production:', d.get('name','already exists'))" 2>/dev/null || echo "  production already exists"

curl -s -X POST "${PACT_BROKER_BASE_URL}/environments" \
  -H "Authorization: Bearer ${PACT_BROKER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name":"staging","displayName":"Staging","production":false}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('  ✓ staging:', d.get('name','already exists'))" 2>/dev/null || echo "  staging already exists"

echo ""

# ─── 2. Pacticipants ──────────────────────────────────────────────────────────

echo "Registering pacticipants..."

register_pacticipant() {
  local name="$1"
  local display="$2"
  curl -s -X POST "${PACT_BROKER_BASE_URL}/pacticipants" \
    -H "Authorization: Bearer ${PACT_BROKER_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${name}\",\"displayName\":\"${display}\",\"mainBranch\":\"main\",\"repositoryUrl\":\"${REPO_URL}\"}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print('  ✓', d.get('name','already exists'))" 2>/dev/null || echo "  ${name} already exists"
}

register_pacticipant "booking-flights-mobile-consumer"   "Booking Flights Mobile Consumer"
register_pacticipant "booking-flights-api"               "Booking Flights API"
register_pacticipant "booking-attractions-mobile-consumer" "Booking Attractions Mobile Consumer"
register_pacticipant "booking-attractions-api"           "Booking Attractions API"

echo ""

# ─── 3. Webhook — trigger provider CI on new pact ─────────────────────────────
#
# When the Flights consumer publishes a new or changed pact, PactFlow should
# immediately trigger the Flights API provider CI so the consumer gets fast feedback.
#
# Replace GITHUB_OWNER, GITHUB_REPO, and GITHUB_TOKEN below with your values.
# The workflow is triggered via repository_dispatch (see provider-flights.yml).
#
# To create the webhook via the PactFlow UI instead:
#   Settings → Webhooks → New Webhook
#   Event: "A pact that requires verification is published"
#   Consumer: booking-flights-mobile-consumer
#   Provider: booking-flights-api

echo "Webhook setup:"
echo "  To automatically trigger the Flights API CI when a consumer pact changes,"
echo "  create a webhook in PactFlow:"
echo ""
echo "  URL: https://api.github.com/repos/OWNER/REPO/dispatches"
echo "  Method: POST"
echo "  Event: Contract content changed"
echo "  Headers:"
echo "    Authorization: token GITHUB_TOKEN"
echo "    Content-Type: application/json"
echo "  Body:"
echo '    {"event_type": "pact_changed_flights_api"}'
echo ""
echo "  Or run: pact-broker create-webhook \\"
echo "    --url 'https://api.github.com/repos/OWNER/REPO/dispatches' \\"
echo "    --request POST \\"
echo "    --header 'Authorization: token GITHUB_TOKEN' \\"
echo "    --header 'Content-Type: application/json' \\"
echo "    --data '{\"event_type\": \"pact_changed_flights_api\"}' \\"
echo "    --consumer booking-flights-mobile-consumer \\"
echo "    --provider booking-flights-api \\"
echo "    --contract-content-changed \\"
echo "    ${BROKER_ARGS}"
echo ""

echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Add PACT_BROKER_TOKEN as a GitHub Actions secret"
echo "  2. Push to main to trigger the first CI run"
echo "  3. View the contract matrix at: ${PACT_BROKER_BASE_URL}"
echo ""
