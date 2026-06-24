// In-memory flight data — simulates what a real Flights microservice would return

const flights = [
  {
    flightId: 'AMS-LHR-20250901-001',
    origin: {
      iata: 'AMS',
      name: 'Amsterdam Airport Schiphol',
      city: 'Amsterdam',
      country: 'NL',
      terminal: '2',
    },
    destination: {
      iata: 'LHR',
      name: 'London Heathrow Airport',
      city: 'London',
      country: 'GB',
      terminal: '4',
    },
    departureTime: '2025-09-01T06:30:00+0000',
    arrivalTime: '2025-09-01T07:00:00+0000',
    durationMinutes: 90,
    airline: {
      code: 'KL',
      name: 'KLM Royal Dutch Airlines',
      logoUrl: 'https://assets.booking.com/airlines/KL.png',
    },
    aircraft: 'Boeing 737-800',
    price: {
      amount: 149.99,
      currency: 'EUR',
      breakdown: {
        baseFare: 119.99,
        taxes: 30.00,
        fees: 0.00,
      },
    },
    availableSeats: 42,
    cabinClass: 'economy',
    baggage: {
      carryOn: { included: true, maxWeightKg: 8 },
      checked: { included: false, pricePerBag: 35.00 },
    },
  },
  {
    flightId: 'AMS-BCN-20250901-002',
    origin: {
      iata: 'AMS',
      name: 'Amsterdam Airport Schiphol',
      city: 'Amsterdam',
      country: 'NL',
      terminal: '3',
    },
    destination: {
      iata: 'BCN',
      name: 'Barcelona–El Prat Airport',
      city: 'Barcelona',
      country: 'ES',
      terminal: '1',
    },
    departureTime: '2025-09-01T10:15:00+0000',
    arrivalTime: '2025-09-01T13:00:00+0000',
    durationMinutes: 165,
    airline: {
      code: 'VY',
      name: 'Vueling Airlines',
      logoUrl: 'https://assets.booking.com/airlines/VY.png',
    },
    aircraft: 'Airbus A320',
    price: {
      amount: 89.50,
      currency: 'EUR',
      breakdown: {
        baseFare: 65.00,
        taxes: 24.50,
        fees: 0.00,
      },
    },
    availableSeats: 18,
    cabinClass: 'economy',
    baggage: {
      carryOn: { included: true, maxWeightKg: 10 },
      checked: { included: false, pricePerBag: 25.00 },
    },
  },
];

const bookings = [];

function searchFlights({ origin, destination, departureDate }) {
  return flights.filter(
    (f) =>
      f.origin.iata === origin &&
      f.destination.iata === destination &&
      f.departureTime.startsWith(departureDate)
  );
}

function getFlightById(flightId) {
  return flights.find((f) => f.flightId === flightId) || null;
}

function createBooking({ flightId, passengers, contactEmail }) {
  const flight = getFlightById(flightId);
  if (!flight) return null;

  const bookingId = `BK-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  const booking = {
    bookingId,
    status: 'CONFIRMED',
    flightId,
    confirmationCode: Math.random().toString(36).substr(2, 6).toUpperCase(),
    totalPrice: {
      amount: flight.price.amount * passengers.length,
      currency: flight.price.currency,
    },
    passengerCount: passengers.length,
    contactEmail,
    createdAt: new Date().toISOString(),
  };

  bookings.push(booking);
  return booking;
}

module.exports = { searchFlights, getFlightById, createBooking };
