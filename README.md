# Booking.com Mobile — Contract Testing Examples

This repository demonstrates **consumer-driven contract testing** with [Pact](https://pact.io) and [PactFlow](https://pactflow.io), using realistic examples drawn from Booking.com's Trips mobile platform.

## Verticals Covered

| Vertical | Tech Stack | Contract Pattern | CI |
|---|---|---|---|
| **Flights** | Node.js/Express REST API | Classic CDC Pact | GitHub Actions |
| **Attractions** | Node.js/Apollo GraphQL | BDCT (OpenAPI) | GitHub Actions |

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Booking Mobile Apps                 │
│  (Kotlin/Swift — simulated here in Node.js/TS)  │
│                                                  │
│  ┌──────────────────┐  ┌──────────────────────┐ │
│  │ Flights Consumer │  │ Attractions Consumer │ │
│  └────────┬─────────┘  └──────────┬───────────┘ │
└───────────┼──────────────────────┼──────────────┘
            │ Pact (CDC)           │ Pact (GraphQL)
            ▼                      ▼
┌───────────────────────────────────────────────┐
│              PactFlow Broker                  │
│         smart-bank.pactflow.io                │
│                                               │
│  Consumer Pacts ◄──────────────► OpenAPI Spec │
│  (Flights CDC)                  (Attractions  │
│                                    BDCT)      │
└───────────────────────────────────────────────┘
            │                      │
            ▼ Provider verify      ▼ Cross-contract verify
┌───────────────────┐  ┌──────────────────────────┐
│   Flights API     │  │    Attractions API        │
│  (REST/Express)   │  │  (GraphQL/Apollo)         │
│  Classic CDC      │  │  BDCT + OpenAPI           │
└───────────────────┘  └──────────────────────────┘
```

### Why two patterns?

- **Flights (Classic CDC)**: The mobile consumer owns the pact. Any change the Flights API makes that would break the mobile app is caught immediately, before it reaches production. This is ideal when the consumer team has strong opinions about the contract.

- **Attractions (BDCT)**: The provider publishes its OpenAPI spec to PactFlow. PactFlow performs the cross-contract verification automatically — the provider team doesn't need to run consumer tests in their CI pipeline. This is ideal for teams migrating from OpenAPI-first development or using GraphQL.

## Quick Start

### Prerequisites

- Node.js 18+
- A PactFlow account (this repo is pre-configured for `smart-bank.pactflow.io`)

### Environment Setup

Each service and consumer has a `.env.example`. Copy it to `.env` and fill in the values.

```bash
# From any service/consumer directory
cp .env.example .env
```

The `PACT_BROKER_TOKEN` is already set in the GitHub Actions secrets for this repo. For local development, set:

```bash
export PACT_BROKER_BASE_URL=https://smart-bank.pactflow.io
export PACT_BROKER_TOKEN=<your-token>
```

### Run Consumer Tests (generates pacts)

```bash
# Flights consumer
cd consumers/flights-mobile-consumer
npm install
npm test

# Attractions consumer
cd consumers/attractions-mobile-consumer
npm install
npm test
```

### Publish Pacts to PactFlow

```bash
# From consumer directory, after tests pass
npm run publish:pacts
```

### Run Provider Verification

```bash
# Flights provider (Classic CDC — fetches pact from broker, verifies)
cd services/flights-api
npm install
npm run test:pact

# Attractions provider (BDCT — publishes OpenAPI + self-verification results)
cd services/attractions-api
npm install
npm run test:bdct
```

## CI/CD Flow

```
Consumer push
  → Run pact tests
  → Publish pacts to PactFlow        (PACT_BROKER_TOKEN secret)
  → can-i-deploy check
  → Deploy
  → Record deployment in PactFlow

Provider push
  → (Flights)    Fetch pacts → verify → publish results
  → (Attractions) Self-test → publish OpenAPI + results (BDCT)
  → can-i-deploy check
  → Deploy
  → Record deployment in PactFlow
```

## Repo Structure

```
.
├── consumers/
│   ├── flights-mobile-consumer/     # Mobile consumer for Flights REST API
│   └── attractions-mobile-consumer/ # Mobile consumer for Attractions GraphQL API
├── services/
│   ├── flights-api/                 # Express REST provider (Classic CDC)
│   └── attractions-api/             # Apollo GraphQL provider (BDCT)
├── .github/
│   └── workflows/
│       ├── consumer-flights.yml
│       ├── consumer-attractions.yml
│       ├── provider-flights.yml
│       └── provider-attractions.yml
└── docs/
    └── architecture.md
```

## Key Concepts Demonstrated

| Concept | Where |
|---|---|
| Consumer pact generation | `consumers/*/tests/*.pact.test.js` |
| Matching rules (type, regex, each-like) | `consumers/flights-mobile-consumer/tests/` |
| GraphQL contract testing | `consumers/attractions-mobile-consumer/tests/` |
| Provider states | `services/flights-api/tests/provider.pact.test.js` |
| BDCT provider contract | `services/attractions-api/tests/provider.bdct.test.js` |
| OpenAPI spec | `services/*/openapi/*.yml` |
| can-i-deploy gate | All four GitHub Actions workflows |
| Record deployment | All four GitHub Actions workflows |
| Auth headers in pacts | Both consumers (Authorization, x-booking-language) |
