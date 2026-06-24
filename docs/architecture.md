# Architecture & Design Decisions

## Why These Two Verticals?

The Booking.com Trips platform has five verticals (Attractions, Cars, Flights, Insurance, Rides).
This demo focuses on **Flights** and **Attractions** because they represent the two most common
integration patterns in the mobile estate:

| Pattern | Used by | This demo |
|---|---|---|
| REST/JSON over vertical-specific gateway | Flights, Cars | Flights API |
| GraphQL via Apollo Federation (DML) | Attractions, Insurance, Rides (target) | Attractions API |

Together they let us demonstrate both Pact patterns (Classic CDC and BDCT) with realistic domain data.

---

## Classic CDC (Flights)

```
Mobile App (consumer)                      Flights API (provider)
─────────────────────                      ──────────────────────
1. Write Pact consumer test
   - Describes what the app
     needs from the API
   - Uses matching rules
     (not hardcoded values)
2. Run test against Pact
   mock server
3. Pact file generated
          │
          └──► PactFlow ◄──────────────── 4. Fetch pacts for verification
                                          5. Run pact against real app
                                          6. Publish results to PactFlow
          │
          └──► can-i-deploy ◄──────────── 7. Both sides check before deploying
```

**Key property**: If the Flights API changes a response field that the mobile app depends on,
the provider verification step (step 5) catches it before either side ships. Neither team
needs to coordinate a release — the contract enforces it automatically.

### Matching Rules in the Flights Consumer

The consumer tests use several categories of matcher:

| Matcher | Usage | Why not exact values? |
|---|---|---|
| `string()` | Text fields (airline name, city) | Values change — structure matters |
| `integer()` | Counts, duration, seats | Type matters, exact value doesn't |
| `decimal()` | Prices | Precision matters, not specific price |
| `regex()` | IATA codes, booking IDs, email | Format enforced, not exact value |
| `datetime()` | Departure/arrival times | Format enforced (ISO 8601) |
| `eachLike()` | Arrays (flights, passengers) | At least one item with this structure |
| `fromProviderState()` | Path params referencing seeded data | Provider controls the ID |

### Provider States

Provider states are the bridge between "what the consumer test assumes" and
"what the provider server actually serves". They answer the question:
*"For this specific test to make sense, what must be true about the world?"*

```javascript
// Consumer declares:
states: [{ description: 'flight AMS-LHR-20250901-001 exists' }]

// Provider implements:
'flight AMS-LHR-20250901-001 exists': async () => {
  // seed the database / in-memory store so GET /v1/flights/AMS-LHR-20250901-001 returns data
}
```

State names are a shared vocabulary between teams. The consumer names them,
the provider implements them — without any runtime coupling.

---

## BDCT (Attractions)

```
Mobile App (consumer)                  Attractions API (provider)
─────────────────────                  ──────────────────────────
1. Write Pact consumer test
   (GraphQL as POST /graphql)
2. Publish pact to PactFlow
          │                            3. Self-verify against own
          │                               Apollo server
          │                            4. Publish OpenAPI spec +
          │                               verification results
          │                                      │
          └──────────► PactFlow ◄────────────────┘
                          │
                    5. Cross-contract
                       verification
                       (automatic)
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
   Consumer pact              Provider OpenAPI spec
   compatible?                compliant with own impl?
          │                               │
          └───────────────┬───────────────┘
                          ▼
                    can-i-deploy
```

**Key property**: The Attractions API CI never needs to fetch or run consumer pact files.
PactFlow does the cross-verification automatically when either side publishes.
A new mobile consumer can onboard without requiring any change to the Attractions pipeline.

### GraphQL in Pact

GraphQL over HTTP is treated as a POST request to a single endpoint (`/graphql`).
The pact tests match on:
- **Request**: method `POST`, path `/graphql`, body containing `query` and `variables`
- **Response**: status `200`, body containing `data` (and optionally `errors`)

We use `like()` for the `query` string because the exact whitespace/formatting of a
GraphQL query document varies between Apollo Client versions and build tools.
The variables are matched with typed matchers.

---

## Common Headers

Both verticals reflect the Booking.com mobile standard headers:

```
Authorization: Bearer <identity-token>    (required — every request)
x-booking-language: en-US                 (locale for content)
x-booking-platform: ios | android         (platform for analytics/feature flags)
x-booking-client: mobile                  (client type)
```

In the pact consumer tests, these are matched with `regex()` / `string()` matchers
rather than exact values — the contract enforces the *structure* (e.g. "Bearer " prefix,
language code format) not the specific token value.

---

## Environments & Deployments

The repo is configured for a single `production` environment. In a real Booking.com setup
you would also register:

- `staging` / `test` — for integration testing
- `nightly` — for the nightly E2E suite (replacing static JSON mock files)

Mobile apps should use `record-release` (not `record-deployment`) because multiple
versions of the app coexist in the wild (users don't always update immediately).

```bash
# For mobile apps — multiple versions coexist
pact-broker record-release \
  --pacticipant "booking-flights-mobile-consumer" \
  --version "2.4.1" \
  --environment "production"

# For backend services — one version at a time
pact-broker record-deployment \
  --pacticipant "booking-flights-api" \
  --version "abc1234" \
  --environment "production"
```

---

## Replacing the E2E Mocked Backend

Currently, Booking.com's mocked backend E2E tests use static JSON files that are
"a nightmare to maintain". Contract testing addresses this at the root cause:

| Current state | With contract testing |
|---|---|
| Static JSON mock files updated manually | Pacts generated automatically from consumer tests |
| Mock drifts from real API silently | Provider verification catches drift immediately |
| Maintenance burden on mobile team | Provider team owns state setup |
| No signal until E2E test run (nightly) | Feedback in minutes, on every push |

The migration path:
1. Write consumer tests for the interactions covered by the most-brittle mock files
2. Publish pacts to PactFlow and add provider state handlers
3. Replace the static JSON mock with a Pact-powered mock server (`pact stub-server`)
4. Retire the static files once confidence is established

---

## PactFlow Workspace

All contracts are published to: **https://smart-bank.pactflow.io**

Pacticipants registered:
- `booking-flights-mobile-consumer`
- `booking-flights-api`
- `booking-attractions-mobile-consumer`
- `booking-attractions-api`
