/**
 * Attractions Mobile Consumer — Pact Tests (GraphQL over HTTP)
 *
 * The Attractions API uses Apollo Federation (DML) — a single GraphQL
 * endpoint for all operations. In Pact terms, GraphQL is still an HTTP
 * POST request, so we match on the request body (operationName + variables).
 *
 * These tests verify that the mobile app's GraphQL client sends the right
 * shape of request and can handle the responses it depends on.
 *
 * The pact files generated here are used in BDCT — PactFlow cross-verifies
 * them against the Attractions API OpenAPI spec automatically.
 */

const path = require('path');
const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const { AttractionsApiClient } = require('../src/attractionsApiClient');

const {
  like,
  eachLike,
  regex,
  integer,
  decimal,
  string,
  fromProviderState,
} = MatchersV3;

const provider = new PactV3({
  consumer: 'booking-attractions-mobile-consumer',
  provider: 'booking-attractions-api',
  dir: path.resolve(__dirname, '../pacts'),
  logLevel: 'warn',
});

// Every Booking mobile request carries these headers
const bookingMobileHeaders = {
  Authorization: regex('Bearer .+', 'Bearer test-identity-token'),
  'x-booking-language': regex('[a-z]{2}-[A-Z]{2}', 'en-US'),
  'x-booking-platform': regex('ios|android', 'ios'),
  'x-booking-client': string('mobile'),
  'Content-Type': regex('application/json.*', 'application/json'),
};

describe('Attractions API — Mobile Consumer Contract (GraphQL)', () => {

  // ─── Search Attractions ───────────────────────────────────────────

  describe('searchAttractions', () => {
    it('returns a list of attractions for a location and date', () => {
      return provider
        .addInteraction({
          states: [{ description: 'attractions exist in Amsterdam on 2025-09-01' }],
          uponReceiving: 'a GraphQL query to search attractions in Amsterdam',
          withRequest: {
            method: 'POST',
            path: '/graphql',
            headers: bookingMobileHeaders,
            body: {
              // Match on the presence of the operation — the exact whitespace/formatting
              // of the query string may vary between Apollo client versions, so we use
              // like() to match on shape rather than exact value.
              query: like(`
                query SearchAttractions($location: String!, $date: String!, $category: String) {
                  searchAttractions(location: $location, date: $date, category: $category) {
                    id name description
                    price { amount currency }
                    rating category
                  }
                }
              `),
              variables: {
                location: string('Amsterdam'),
                date: string('2025-09-01'),
                category: string('MUSEUMS'),
              },
            },
          },
          willRespondWith: {
            status: 200,
            headers: { 'Content-Type': regex('application/json.*', 'application/json') },
            body: {
              data: {
                searchAttractions: eachLike({
                  id: string('attr-rijksmuseum-001'),
                  name: string('Rijksmuseum'),
                  description: string('The national museum of the Netherlands'),
                  price: {
                    amount: decimal(22.50),
                    currency: string('EUR'),
                  },
                  rating: decimal(4.8),
                  category: string('MUSEUMS'),
                }),
              },
            },
          },
        })
        .executeTest(async (mockServer) => {
          const client = new AttractionsApiClient(mockServer.url, 'test-identity-token');
          const response = await client.searchAttractions({
            location: 'Amsterdam',
            date: '2025-09-01',
            category: 'MUSEUMS',
          });
          expect(response.status).toBe(200);
          expect(response.data.data.searchAttractions).toHaveLength(1);
          expect(response.data.data.searchAttractions[0].name).toBe('Rijksmuseum');
        });
    });

    it('returns an empty list when no attractions are available', () => {
      return provider
        .addInteraction({
          states: [{ description: 'no attractions exist in location NOWHERE on 2025-09-01' }],
          uponReceiving: 'a GraphQL search for attractions in a location with no results',
          withRequest: {
            method: 'POST',
            path: '/graphql',
            headers: bookingMobileHeaders,
            body: {
              query: like('query SearchAttractions($location: String!, $date: String!, $category: String) { searchAttractions(location: $location, date: $date, category: $category) { id name description price { amount currency } rating category } }'),
              variables: {
                location: string('NOWHERE'),
                date: string('2025-09-01'),
              },
            },
          },
          willRespondWith: {
            status: 200,
            body: {
              data: {
                searchAttractions: [],
              },
            },
          },
        })
        .executeTest(async (mockServer) => {
          const client = new AttractionsApiClient(mockServer.url, 'test-identity-token');
          const response = await client.searchAttractions({
            location: 'NOWHERE',
            date: '2025-09-01',
          });
          expect(response.status).toBe(200);
          expect(response.data.data.searchAttractions).toHaveLength(0);
        });
    });
  });

  // ─── Get Attraction Detail ─────────────────────────────────────────

  describe('getAttraction', () => {
    it('returns full attraction details including location and available dates', () => {
      return provider
        .addInteraction({
          states: [{ description: 'attraction attr-rijksmuseum-001 exists' }],
          uponReceiving: 'a GraphQL query to get a specific attraction by ID',
          withRequest: {
            method: 'POST',
            path: '/graphql',
            headers: bookingMobileHeaders,
            body: {
              query: like('query GetAttraction($id: ID!) { getAttraction(id: $id) { id name description location { city country coordinates { lat lng } } price { amount currency } rating availableDates category images } }'),
              variables: {
                id: fromProviderState('${attractionId}', 'attr-rijksmuseum-001'),
              },
            },
          },
          willRespondWith: {
            status: 200,
            body: {
              data: {
                getAttraction: {
                  id: string('attr-rijksmuseum-001'),
                  name: string('Rijksmuseum'),
                  description: string('The national museum of the Netherlands, home to Rembrandt and Vermeer'),
                  location: {
                    city: string('Amsterdam'),
                    country: string('NL'),
                    coordinates: {
                      lat: decimal(52.36),
                      lng: decimal(4.885),
                    },
                  },
                  price: {
                    amount: decimal(22.50),
                    currency: string('EUR'),
                  },
                  rating: decimal(4.8),
                  availableDates: eachLike(string('2025-09-01')),
                  category: string('MUSEUMS'),
                  images: eachLike(string('https://assets.booking.com/attractions/rijksmuseum-01.jpg')),
                },
              },
            },
          },
        })
        .executeTest(async (mockServer) => {
          const client = new AttractionsApiClient(mockServer.url, 'test-identity-token');
          const response = await client.getAttraction('attr-rijksmuseum-001');
          expect(response.status).toBe(200);
          const attraction = response.data.data.getAttraction;
          expect(attraction.id).toBe('attr-rijksmuseum-001');
          expect(attraction.location.city).toBe('Amsterdam');
          expect(attraction.price.currency).toBe('EUR');
        });
    });

    it('returns null for an attraction that does not exist', () => {
      return provider
        .addInteraction({
          states: [{ description: 'no attraction with ID attr-unknown-999 exists' }],
          uponReceiving: 'a GraphQL query for an attraction that does not exist',
          withRequest: {
            method: 'POST',
            path: '/graphql',
            headers: bookingMobileHeaders,
            body: {
              query: like('query GetAttraction($id: ID!) { getAttraction(id: $id) { id name description location { city country coordinates { lat lng } } price { amount currency } rating availableDates category images } }'),
              variables: {
                id: string('attr-unknown-999'),
              },
            },
          },
          willRespondWith: {
            status: 200,
            body: {
              data: {
                getAttraction: null,
              },
            },
          },
        })
        .executeTest(async (mockServer) => {
          const client = new AttractionsApiClient(mockServer.url, 'test-identity-token');
          const response = await client.getAttraction('attr-unknown-999');
          expect(response.status).toBe(200);
          expect(response.data.data.getAttraction).toBeNull();
        });
    });
  });

  // ─── Book Attraction ───────────────────────────────────────────────

  describe('bookAttraction', () => {
    it('creates an attraction booking and returns a confirmation', () => {
      return provider
        .addInteraction({
          states: [
            { description: 'attraction attr-rijksmuseum-001 exists' },
            { description: 'the user is authenticated and eligible to book' },
          ],
          uponReceiving: 'a GraphQL mutation to book an attraction',
          withRequest: {
            method: 'POST',
            path: '/graphql',
            headers: bookingMobileHeaders,
            body: {
              query: like('mutation BookAttraction($input: BookAttractionInput!) { bookAttraction(input: $input) { bookingId status attractionId date participants totalPrice { amount currency } confirmationCode } }'),
              variables: {
                input: {
                  attractionId: string('attr-rijksmuseum-001'),
                  date: string('2025-09-01'),
                  participants: integer(2),
                  contactEmail: regex('^[\\w.+-]+@[\\w-]+\\.[a-z]{2,}$', 'jan.devries@example.com'),
                },
              },
            },
          },
          willRespondWith: {
            status: 200,
            body: {
              data: {
                bookAttraction: {
                  bookingId: regex('^ATB-[A-Z0-9]{8}$', 'ATB-XY12AB34'),
                  status: string('CONFIRMED'),
                  attractionId: string('attr-rijksmuseum-001'),
                  date: string('2025-09-01'),
                  participants: integer(2),
                  totalPrice: {
                    amount: decimal(45.00),
                    currency: string('EUR'),
                  },
                  confirmationCode: string('RIJKS9Z'),
                },
              },
            },
          },
        })
        .executeTest(async (mockServer) => {
          const client = new AttractionsApiClient(mockServer.url, 'test-identity-token');
          const response = await client.bookAttraction({
            attractionId: 'attr-rijksmuseum-001',
            date: '2025-09-01',
            participants: 2,
            contactEmail: 'jan.devries@example.com',
          });
          expect(response.status).toBe(200);
          const booking = response.data.data.bookAttraction;
          expect(booking.status).toBe('CONFIRMED');
          expect(booking.bookingId).toMatch(/^ATB-[A-Z0-9]{8}$/);
        });
    });
  });
});
