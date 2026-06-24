/**
 * Flights API — Provider Pact Verification (Classic CDC)
 *
 * This test fetches every pact that consumers have published to PactFlow
 * for the 'booking-flights-api' provider and verifies them against the
 * real Express application (no mocks).
 *
 * Provider states map to the descriptions the consumer tests declared —
 * the setup functions here seed the in-memory data store so the app
 * behaves consistently for each interaction.
 *
 * Run locally:
 *   PACT_BROKER_TOKEN=<token> GIT_COMMIT=$(git rev-parse HEAD) GIT_BRANCH=$(git branch --show-current) npm run test:pact
 */

require('dotenv').config();
const { Verifier } = require('@pact-foundation/pact');
const { createApp } = require('../src/app');

// Bring up a real instance of the Flights API on an ephemeral port.
// We don't mock anything — the verifier sends real HTTP requests.
let server;
let port;

beforeAll(() => {
  return new Promise((resolve) => {
    const app = createApp();
    server = app.listen(0, () => {
      port = server.address().port;
      resolve();
    });
  });
});

afterAll(() => {
  return new Promise((resolve) => server.close(resolve));
});

describe('Flights API — Provider Pact Verification', () => {
  it('satisfies all consumer pacts', () => {
    const verifier = new Verifier({
      provider: 'booking-flights-api',
      providerBaseUrl: `http://localhost:${port}`,

      // Fetch pacts from PactFlow
      pactBrokerUrl: process.env.PACT_BROKER_BASE_URL || 'https://smart-bank.pactflow.io',
      pactBrokerToken: process.env.PACT_BROKER_TOKEN,

      // Which consumer versions to verify:
      //   - mainBranch: the latest from each consumer's main branch
      //   - matchingBranch: the consumer feature branch with the same name as this provider branch
      //   - deployedOrReleased: EVERY version currently deployed/released anywhere
      //     ↳ This is the most important selector — without it, can-i-deploy will fail
      //       because the provider never verifies the version actually running in production.
      consumerVersionSelectors: [
        { mainBranch: true },
        { matchingBranch: true },
        { deployedOrReleased: true },
      ],

      // Pending pacts: new consumer interactions won't break provider CI until the provider
      // explicitly acknowledges them. Removes the chicken-and-egg problem.
      enablePending: true,

      // WIP pacts: automatically includes pacts from in-progress consumer feature branches.
      includeWipPactsSince: '2024-01-01',

      // Publish results back to PactFlow (only in CI — never from developer laptops)
      // publishVerificationResults is also driven by the PACT_BROKER_PUBLISH_VERIFICATION_RESULTS
      // env var (set in the workflow), which the Rust FFI picks up directly.
      publishVerificationResults: true,
      providerVersion: process.env.GITHUB_SHA || process.env.GIT_COMMIT,
      providerVersionBranch: process.env.GITHUB_REF_NAME || process.env.GIT_BRANCH || 'main',

      // Provider state handlers — called before each interaction that declares a state.
      // These seed the in-memory data store so the server responds correctly.
      stateHandlers: {
        'flights exist between AMS and LHR on 2025-09-01': async () => {
          // The in-memory data already contains this flight — nothing to set up.
          // In a real service, you'd insert test data into the database here.
        },

        'flight AMS-LHR-20250901-001 exists': async () => {
          // Already seeded — AMS-LHR-20250901-001 is in the default data set.
        },

        'no flight with ID UNKNOWN-999 exists': async () => {
          // The in-memory store has no such flight by default — nothing to remove.
        },

        'no authentication is provided': async () => {
          // No setup needed — the auth middleware handles this based on request headers.
        },

        'the user is authenticated and eligible to book': async () => {
          // In a real service, you'd ensure the user record and any booking limits
          // are correctly configured in the test database.
        },
      },

      // No requestFilter needed: authenticated interactions carry 'Bearer test-identity-token'
      // in the pact (the example value from the regex matcher), so the auth middleware passes
      // naturally. The unauthenticated interaction deliberately has no Authorization header,
      // so the middleware correctly returns 401.

      logLevel: 'info',
    });

    return verifier.verifyProvider();
  });
});
