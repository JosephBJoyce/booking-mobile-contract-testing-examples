const axios = require('axios');

class FlightsApiClient {
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

  searchFlights({ origin, destination, departureDate, returnDate, passengers = 1, cabinClass = 'economy' }) {
    return this.client.get('/v1/flights/search', {
      params: { origin, destination, departureDate, returnDate, passengers, cabinClass },
    });
  }

  getFlight(flightId) {
    return this.client.get(`/v1/flights/${flightId}`);
  }

  createBooking({ flightId, passengers, contactEmail }) {
    return this.client.post('/v1/bookings', { flightId, passengers, contactEmail });
  }
}

module.exports = { FlightsApiClient };
