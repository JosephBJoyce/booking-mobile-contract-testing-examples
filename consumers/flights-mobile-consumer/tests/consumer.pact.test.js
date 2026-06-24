/**
 * Flights Mobile Consumer — Pact Tests (Classic CDC)
 *
 * These tests define the contract between the Booking mobile app
 * and the Flights REST API. They run entirely without a real server —
 * Pact spins up a mock and verifies the client code against it.
 *
 * The generated pact files in ./pacts/ are published to PactFlow and
 * later verified by the Flights API provider in its own CI pipeline.
 */

const path = require('path');
const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const { FlightsApiClient } = require('../src/flightsApiClient');

const {
  like,
  eachLike,
  regex,
  integer,
  decimal,
  string,
  datetime,
  fromProviderState,
} = MatchersV3;

const provider = new PactV3({
  consumer: 'booking-flights-mobile-consumer',
  provider: 'booking-flights-api',
  dir: path.resolve(__dirname, '../pacts'),
  logLevel: 'warn',
});

// Shared header matchers — every Booking mobile request carries these
const bookingMobileHeaders = {
  Authorization: regex('Bearer .+', 'Bearer test-identity-token'),
  'x-booking-language': regex('[a-z]{2}-[A-Z]{2}', 'en-US'),
  'x-booking-platform': regex('ios|android', 'ios'),
  'x-booking-client': string('mobile'),
};

// ISO 8601 timestamp — matches with or without milliseconds
const isoTimestamp = (example) =>
  regex("^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?(Z|[+-]\\d{4})$", example);

describe('Flights API — Mobile Consumer Contract', () => {

  // ─── Flight Search ───────────────────────────────────────────────

  describe('searchFlights', () => {
    it('returns a list of available flights for a one-way search', () => {
      return provider
        .addInteraction({
          states: [{ description: 'flights exist between AMS and LHR on 2025-09-01' }],
          uponReceiving: 'a one-way flight search from AMS to LHR',
          withRequest: {
            method: 'GET',
            path: '/v1/flights/search',
            query: {
              origin: 'AMS',
              destination: 'LHR',
              departureDate: '2025-09-01',
              passengers: '1',
              cabinClass: 'economy',
            },
            headers: bookingMobileHeaders,
          },
          willRespondWith: {
            status: 200,
            body: {
              flights: eachLike({
                flightId: string('AMS-LHR-20250901-001'),
                // Provider returns a full Airport object in both search and detail responses
                origin: like({
                  iata: string('AMS'),
                  name: string('Amsterdam Airport Schiphol'),
                  city: string('Amsterdam'),
                  country: string('NL'),
                }),
                destination: like({
                  iata: string('LHR'),
                  name: string('London Heathrow Airport'),
                  city: string('London'),
                  country: string('GB'),
                }),
                departureTime: isoTimestamp('2025-09-01T06:30:00+0000'),
                arrivalTime: isoTimestamp('2025-09-01T07:00:00+0000'),
                durationMinutes: integer(90),
                airline: {
                  code: string('KL'),
                  name: string('KLM Royal Dutch Airlines'),
                },
                price: {
                  amount: decimal(149.99),
                  currency: string('EUR'),
                },
                availableSeats: integer(42),
                cabinClass: string('economy'),
              }),
              totalResults: integer(1),
            },
          },
        })
        .executeTest(async (mockServer) => {
          const client = new FlightsApiClient(mockServer.url, 'test-identity-token');
          const response = await client.searchFlights({
            origin: 'AMS',
            destination: 'LHR',
            departureDate: '2025-09-01',
            passengers: 1,
            cabinClass: 'economy',
          });
          expect(response.status).toBe(200);
          expect(response.data.flights).toHaveLength(1);
          expect(response.data.flights[0].origin.iata).toBe('AMS');
          expect(response.data.flights[0].destination.iata).toBe('LHR');
        });
    });

    it('returns 401 when the identity token is missing', () => {
      return provider
        .addInteraction({
          states: [{ description: 'no authentication is provided' }],
          uponReceiving: 'an unauthenticated flight search request',
          withRequest: {
            method: 'GET',
            path: '/v1/flights/search',
            query: {
              origin: 'AMS',
              destination: 'LHR',
              departureDate: '2025-09-01',
              passengers: '1',
              cabinClass: 'economy',
            },
            headers: {
              // No Authorization header — deliberately absent
              'x-booking-language': string('en-US'),
              'x-booking-platform': string('ios'),
            },
          },
          willRespondWith: {
            status: 401,
            body: {
              error: string('UNAUTHORIZED'),
              message: string('A valid identity token is required'),
            },
          },
        })
        .executeTest(async (mockServer) => {
          const client = new FlightsApiClient(mockServer.url, '');
          delete client.client.defaults.headers.common['Authorization'];
          try {
            await client.searchFlights({
              origin: 'AMS',
              destination: 'LHR',
              departureDate: '2025-09-01',
              passengers: 1,
              cabinClass: 'economy',
            });
          } catch (err) {
            expect(err.response.status).toBe(401);
          }
        });
    });
  });

  // ─── Get Flight by ID ─────────────────────────────────────────────

  describe('getFlight', () => {
    it('returns full flight details for a known flight ID', () => {
      return provider
        .addInteraction({
          states: [{ description: 'flight AMS-LHR-20250901-001 exists' }],
          uponReceiving: 'a request for a specific flight by ID',
          withRequest: {
            method: 'GET',
            path: fromProviderState(
              '/v1/flights/${flightId}',
              '/v1/flights/AMS-LHR-20250901-001'
            ),
            headers: bookingMobileHeaders,
          },
          willRespondWith: {
            status: 200,
            body: {
              flightId: string('AMS-LHR-20250901-001'),
              origin: {
                iata: string('AMS'),
                name: string('Amsterdam Airport Schiphol'),
                city: string('Amsterdam'),
                country: string('NL'),
                terminal: string('2'),
              },
              destination: {
                iata: string('LHR'),
                name: string('London Heathrow Airport'),
                city: string('London'),
                country: string('GB'),
                terminal: string('4'),
              },
              departureTime: isoTimestamp('2025-09-01T06:30:00+0000'),
              arrivalTime: isoTimestamp('2025-09-01T07:00:00+0000'),
              durationMinutes: integer(90),
              airline: {
                code: string('KL'),
                name: string('KLM Royal Dutch Airlines'),
                logoUrl: string('https://assets.booking.com/airlines/KL.png'),
              },
              aircraft: string('Boeing 737-800'),
              price: {
                amount: decimal(149.99),
                currency: string('EUR'),
                breakdown: {
                  baseFare: decimal(119.99),
                  // 30.0 and 0.0 serialize as integers in JSON; use like() not decimal()
                  taxes: like(30),
                  fees: like(0),
                },
              },
              availableSeats: integer(42),
              cabinClass: string('economy'),
              baggage: {
                carryOn: like({ included: true, maxWeightKg: 8 }),
                checked: like({ included: false, pricePerBag: 35.00 }),
              },
            },
          },
        })
        .executeTest(async (mockServer) => {
          const client = new FlightsApiClient(mockServer.url, 'test-identity-token');
          const response = await client.getFlight('AMS-LHR-20250901-001');
          expect(response.status).toBe(200);
          expect(response.data.flightId).toBe('AMS-LHR-20250901-001');
          expect(response.data.origin.iata).toBe('AMS');
          expect(response.data.price.currency).toBe('EUR');
        });
    });

    it('returns 404 when the flight does not exist', () => {
      return provider
        .addInteraction({
          states: [{ description: 'no flight with ID UNKNOWN-999 exists' }],
          uponReceiving: 'a request for a flight that does not exist',
          withRequest: {
            method: 'GET',
            path: '/v1/flights/UNKNOWN-999',
            headers: bookingMobileHeaders,
          },
          willRespondWith: {
            status: 404,
            body: {
              error: string('NOT_FOUND'),
              message: string('Flight not found'),
            },
          },
        })
        .executeTest(async (mockServer) => {
          const client = new FlightsApiClient(mockServer.url, 'test-identity-token');
          try {
            await client.getFlight('UNKNOWN-999');
          } catch (err) {
            expect(err.response.status).toBe(404);
          }
        });
    });
  });

  // ─── Create Booking ───────────────────────────────────────────────

  describe('createBooking', () => {
    it('creates a flight booking and returns a confirmation', () => {
      return provider
        .addInteraction({
          states: [
            { description: 'flight AMS-LHR-20250901-001 exists' },
            { description: 'the user is authenticated and eligible to book' },
          ],
          uponReceiving: 'a request to book a flight',
          withRequest: {
            method: 'POST',
            path: '/v1/bookings',
            headers: {
              ...bookingMobileHeaders,
              'Content-Type': 'application/json',
            },
            body: {
              flightId: string('AMS-LHR-20250901-001'),
              passengers: eachLike({
                firstName: string('Jan'),
                lastName: string('de Vries'),
                dateOfBirth: string('1985-03-15'),
                passportNumber: string('NL1234567'),
              }),
              contactEmail: regex('^[\\w.+-]+@[\\w-]+\\.[a-z]{2,}$', 'jan.devries@example.com'),
            },
          },
          willRespondWith: {
            status: 201,
            body: {
              bookingId: regex('^BK-[A-Z0-9]{8}$', 'BK-ABC12345'),
              status: string('CONFIRMED'),
              flightId: string('AMS-LHR-20250901-001'),
              confirmationCode: string('KL4R2X'),
              totalPrice: {
                amount: decimal(149.99),
                currency: string('EUR'),
              },
              passengerCount: integer(1),
              contactEmail: string('jan.devries@example.com'),
              // ISO 8601 with or without milliseconds
              createdAt: isoTimestamp('2025-08-15T14:30:00.000Z'),
            },
          },
        })
        .executeTest(async (mockServer) => {
          const client = new FlightsApiClient(mockServer.url, 'test-identity-token');
          const response = await client.createBooking({
            flightId: 'AMS-LHR-20250901-001',
            passengers: [
              {
                firstName: 'Jan',
                lastName: 'de Vries',
                dateOfBirth: '1985-03-15',
                passportNumber: 'NL1234567',
              },
            ],
            contactEmail: 'jan.devries@example.com',
          });
          expect(response.status).toBe(201);
          expect(response.data.status).toBe('CONFIRMED');
          expect(response.data.bookingId).toMatch(/^BK-[A-Z0-9]{8}$/);
        });
    });
  });
});
