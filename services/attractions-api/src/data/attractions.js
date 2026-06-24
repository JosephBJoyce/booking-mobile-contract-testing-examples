const attractions = [
  {
    id: 'attr-rijksmuseum-001',
    name: 'Rijksmuseum',
    description: 'The national museum of the Netherlands, home to Rembrandt and Vermeer',
    location: {
      city: 'Amsterdam',
      country: 'NL',
      coordinates: { lat: 52.36, lng: 4.885 },
    },
    price: { amount: 22.50, currency: 'EUR' },
    rating: 4.8,
    availableDates: ['2025-09-01', '2025-09-02', '2025-09-03'],
    category: 'MUSEUMS',
    images: ['https://assets.booking.com/attractions/rijksmuseum-01.jpg'],
  },
  {
    id: 'attr-anne-frank-002',
    name: 'Anne Frank House',
    description: 'The historic house where Anne Frank hid during World War II',
    location: {
      city: 'Amsterdam',
      country: 'NL',
      coordinates: { lat: 52.375, lng: 4.884 },
    },
    price: { amount: 16.00, currency: 'EUR' },
    rating: 4.9,
    availableDates: ['2025-09-01', '2025-09-02'],
    category: 'MUSEUMS',
    images: ['https://assets.booking.com/attractions/anne-frank-01.jpg'],
  },
  {
    id: 'attr-keukenhof-003',
    name: 'Keukenhof Gardens',
    description: 'The world-famous flower garden with millions of tulips',
    location: {
      city: 'Lisse',
      country: 'NL',
      coordinates: { lat: 52.27, lng: 4.547 },
    },
    price: { amount: 19.50, currency: 'EUR' },
    rating: 4.7,
    availableDates: ['2025-09-01'],
    category: 'NATURE',
    images: ['https://assets.booking.com/attractions/keukenhof-01.jpg'],
  },
];

const bookings = [];

function searchAttractions({ location, date, category }) {
  return attractions.filter((a) => {
    const matchesLocation =
      a.location.city.toLowerCase() === location.toLowerCase() ||
      a.location.country.toLowerCase() === location.toLowerCase();
    const matchesDate = !date || a.availableDates.includes(date);
    const matchesCategory = !category || a.category === category;
    return matchesLocation && matchesDate && matchesCategory;
  });
}

function getAttractionById(id) {
  return attractions.find((a) => a.id === id) || null;
}

function createAttractionBooking({ attractionId, date, participants, contactEmail }) {
  const attraction = getAttractionById(attractionId);
  if (!attraction) return null;

  const booking = {
    bookingId: `ATB-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
    status: 'CONFIRMED',
    attractionId,
    date,
    participants,
    totalPrice: {
      amount: attraction.price.amount * participants,
      currency: attraction.price.currency,
    },
    confirmationCode: Math.random().toString(36).substr(2, 7).toUpperCase(),
  };

  bookings.push(booking);
  return booking;
}

module.exports = { searchAttractions, getAttractionById, createAttractionBooking };
