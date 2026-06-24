const express = require('express');
const { createBooking } = require('../data/flights');

const router = express.Router();

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

// POST /v1/bookings
router.post('/', requireAuth, (req, res) => {
  const { flightId, passengers, contactEmail } = req.body;

  if (!flightId || !passengers || !contactEmail) {
    return res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'flightId, passengers, and contactEmail are required',
    });
  }

  if (!Array.isArray(passengers) || passengers.length === 0) {
    return res.status(422).json({
      error: 'VALIDATION_ERROR',
      message: 'passengers must be a non-empty array',
    });
  }

  const booking = createBooking({ flightId, passengers, contactEmail });
  if (!booking) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: 'Flight not found',
    });
  }

  res.status(201).json(booking);
});

module.exports = router;
