const axios = require('axios');

class AttractionsApiClient {
  constructor(baseUrl, identityToken, language = 'en-US', platform = 'ios') {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        Authorization: `Bearer ${identityToken}`,
        'x-booking-language': language,
        'x-booking-platform': platform,
        'x-booking-client': 'mobile',
        'Content-Type': 'application/json',
      },
    });
  }

  // All GraphQL requests go through the single /graphql endpoint
  async graphql(query, variables = {}) {
    return this.client.post('/graphql', { query, variables });
  }

  searchAttractions({ location, date, category }) {
    const query = `
      query SearchAttractions($location: String!, $date: String!, $category: String) {
        searchAttractions(location: $location, date: $date, category: $category) {
          id
          name
          description
          price {
            amount
            currency
          }
          rating
          category
        }
      }
    `;
    return this.graphql(query, { location, date, category });
  }

  getAttraction(id) {
    const query = `
      query GetAttraction($id: ID!) {
        getAttraction(id: $id) {
          id
          name
          description
          location {
            city
            country
            coordinates {
              lat
              lng
            }
          }
          price {
            amount
            currency
          }
          rating
          availableDates
          category
          images
        }
      }
    `;
    return this.graphql(query, { id });
  }

  bookAttraction({ attractionId, date, participants, contactEmail }) {
    const mutation = `
      mutation BookAttraction($input: BookAttractionInput!) {
        bookAttraction(input: $input) {
          bookingId
          status
          attractionId
          date
          participants
          totalPrice {
            amount
            currency
          }
          confirmationCode
        }
      }
    `;
    return this.graphql(mutation, {
      input: { attractionId, date, participants, contactEmail },
    });
  }
}

module.exports = { AttractionsApiClient };
