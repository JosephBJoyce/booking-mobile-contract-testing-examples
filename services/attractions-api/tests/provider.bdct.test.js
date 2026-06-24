/**
 * Attractions API — BDCT Self-Verification (Bi-Directional Contract Testing)
 *
 * In BDCT the provider does NOT run the consumer's pact file directly.
 * Instead it:
 *   1. Verifies its own implementation against its OpenAPI spec (this file)
 *   2. Publishes the spec + verification results to PactFlow
 *   3. PactFlow performs the cross-contract verification automatically
 *
 * This is particularly well-suited to the Attractions API because:
 *   - It uses Apollo Federation (DML) — an OpenAPI spec already describes the HTTP layer
 *   - The provider team can evolve their API and validate against the spec independently
 *   - Adding a new consumer does not require changing the provider's CI pipeline
 *
 * The verification results produced here are published in the GitHub Actions workflow
 * using `pact-broker publish-provider-contract`.
 *
 * Run locally:
 *   npm run test:bdct
 */

const supertest = require('supertest');
const { createApp } = require('../src/server');
const fs = require('fs');
const path = require('path');

let app;
let request;

beforeAll(async () => {
  app = await createApp();
  request = supertest(app);
});

// Shared auth header matching the OpenAPI security requirement
const AUTH = { Authorization: 'Bearer bdct-self-verification-token' };
const MOBILE = { 'x-booking-language': 'en-US', 'x-booking-platform': 'ios' };

const results = { tests: [], passed: 0, failed: 0 };

function record(name, passed, detail = '') {
  results.tests.push({ name, passed, detail });
  if (passed) results.passed++;
  else results.failed++;
}

// ─── Query: searchAttractions ─────────────────────────────────────────────────

describe('BDCT Self-Verification: searchAttractions', () => {
  it('returns 200 with an array of attractions', async () => {
    const res = await request
      .post('/graphql')
      .set({ ...AUTH, ...MOBILE })
      .send({
        query: `query { searchAttractions(location: "Amsterdam", date: "2025-09-01") { id name price { amount currency } rating category } }`,
      });

    const passed = res.status === 200 && Array.isArray(res.body.data?.searchAttractions);
    record('searchAttractions returns 200 with array', passed, JSON.stringify(res.body));
    expect(passed).toBe(true);
  });

  it('returns an empty array for an unknown location', async () => {
    const res = await request
      .post('/graphql')
      .set({ ...AUTH, ...MOBILE })
      .send({
        query: `query { searchAttractions(location: "NOWHERE", date: "2025-09-01") { id name } }`,
      });

    const passed = res.status === 200 && Array.isArray(res.body.data?.searchAttractions) && res.body.data.searchAttractions.length === 0;
    record('searchAttractions returns empty array for unknown location', passed);
    expect(passed).toBe(true);
  });

  it('filters by category', async () => {
    const res = await request
      .post('/graphql')
      .set({ ...AUTH, ...MOBILE })
      .send({
        query: `query { searchAttractions(location: "Amsterdam", date: "2025-09-01", category: "MUSEUMS") { id category } }`,
      });

    const passed =
      res.status === 200 &&
      res.body.data?.searchAttractions?.every((a) => a.category === 'MUSEUMS');
    record('searchAttractions filters by category', passed);
    expect(passed).toBe(true);
  });
});

// ─── Query: getAttraction ─────────────────────────────────────────────────────

describe('BDCT Self-Verification: getAttraction', () => {
  it('returns full attraction details for a known ID', async () => {
    const res = await request
      .post('/graphql')
      .set({ ...AUTH, ...MOBILE })
      .send({
        query: `query { getAttraction(id: "attr-rijksmuseum-001") { id name description location { city country coordinates { lat lng } } price { amount currency } rating availableDates category images } }`,
      });

    const attraction = res.body.data?.getAttraction;
    const passed =
      res.status === 200 &&
      attraction?.id === 'attr-rijksmuseum-001' &&
      typeof attraction.price?.amount === 'number' &&
      Array.isArray(attraction.availableDates);
    record('getAttraction returns full details', passed, JSON.stringify(res.body));
    expect(passed).toBe(true);
  });

  it('returns null for an unknown attraction ID', async () => {
    const res = await request
      .post('/graphql')
      .set({ ...AUTH, ...MOBILE })
      .send({
        query: `query { getAttraction(id: "attr-unknown-999") { id name } }`,
      });

    const passed = res.status === 200 && res.body.data?.getAttraction === null;
    record('getAttraction returns null for unknown ID', passed);
    expect(passed).toBe(true);
  });
});

// ─── Mutation: bookAttraction ─────────────────────────────────────────────────

describe('BDCT Self-Verification: bookAttraction', () => {
  it('creates a booking and returns confirmation with a booking ID', async () => {
    const res = await request
      .post('/graphql')
      .set({ ...AUTH, ...MOBILE })
      .send({
        query: `mutation { bookAttraction(input: { attractionId: "attr-rijksmuseum-001", date: "2025-09-01", participants: 2, contactEmail: "test@example.com" }) { bookingId status attractionId date participants totalPrice { amount currency } confirmationCode } }`,
      });

    const booking = res.body.data?.bookAttraction;
    const passed =
      res.status === 200 &&
      booking?.status === 'CONFIRMED' &&
      /^ATB-[A-Z0-9]{8}$/.test(booking?.bookingId) &&
      booking?.participants === 2;
    record('bookAttraction creates a confirmed booking', passed, JSON.stringify(res.body));
    expect(passed).toBe(true);
  });

  it('returns an auth error when no identity token is provided', async () => {
    const res = await request
      .post('/graphql')
      .set(MOBILE)
      .send({
        query: `mutation { bookAttraction(input: { attractionId: "attr-rijksmuseum-001", date: "2025-09-01", participants: 1, contactEmail: "test@example.com" }) { bookingId } }`,
      });

    const passed =
      res.status === 200 &&
      res.body.errors?.[0]?.extensions?.code === 'UNAUTHORIZED';
    record('bookAttraction returns UNAUTHORIZED without token', passed);
    expect(passed).toBe(true);
  });
});

// ─── Health check ─────────────────────────────────────────────────────────────

describe('BDCT Self-Verification: health', () => {
  it('returns 200 on /health', async () => {
    const res = await request.get('/health');
    const passed = res.status === 200 && res.body.status === 'ok';
    record('health endpoint returns 200', passed);
    expect(passed).toBe(true);
  });
});

// ─── Write verification results ───────────────────────────────────────────────

afterAll(() => {
  // Produce a verification results JSON file that is published to PactFlow
  // alongside the OpenAPI spec. PactFlow uses this to determine whether
  // the provider's implementation is consistent with its own contract.
  const output = {
    providerApplicationVersion: process.env.GIT_COMMIT || 'local',
    success: results.failed === 0,
    testResults: results.tests.map((t) => ({
      testDescription: t.name,
      success: t.passed,
      ...(t.detail ? { failureReason: t.detail } : {}),
    })),
    summary: {
      testCount: results.tests.length,
      failureCount: results.failed,
    },
  };

  const outPath = path.resolve(__dirname, '../verification-results.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nVerification results written to ${outPath}`);
  console.log(`  Tests: ${results.tests.length}, Passed: ${results.passed}, Failed: ${results.failed}`);
});
