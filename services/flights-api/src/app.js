const express = require('express');
const flightsRouter = require('./routes/flights');
const bookingsRouter = require('./routes/bookings');

function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ status: 'ok', service: 'booking-flights-api' }));
  app.use('/v1/flights', flightsRouter);
  app.use('/v1/bookings', bookingsRouter);

  return app;
}

module.exports = { createApp };
