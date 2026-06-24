const express = require('express');
const { searchFlights, getFlightById, createBooking } = require('../data/flights');

const router = express.Router();

// Auth middleware — every request requires a Bearer token (identity token)
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'A valid identity token is required',
    });
  }
  next();
}

// GET /v1/flights/search
router.get('/search', requireAuth, (req, res) => {
  const { origin, destination, departureDate, passengers = '1', cabinClass = 'economy' } = req.query;

  if (!origin || !destination || !departureDate) {
    return res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'origin, destination, and departureDate are required',
    });
  }

  const results = searchFlights({ origin, destination, departureDate });

  res.json({
    flights: results,
    totalResults: results.length,
  });
});

// GET /v1/flights/:flightId
router.get('/:flightId', requireAuth, (req, res) => {
  const flight = getFlightById(req.params.flightId);
  if (!flight) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Flight not found',
    });
  }
  res.json(flight);
});

module.exports = router;
