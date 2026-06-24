const { gql } = require('graphql-tag');

const typeDefs = gql`
  enum AttractionCategory {
    MUSEUMS
    NATURE
    TOURS
    ENTERTAINMENT
    FOOD_AND_DRINK
    SPORTS
    WELLNESS
  }

  type Coordinates {
    lat: Float!
    lng: Float!
  }

  type Location {
    city: String!
    country: String!
    coordinates: Coordinates!
  }

  type Price {
    amount: Float!
    currency: String!
  }

  type Attraction {
    id: ID!
    name: String!
    description: String
    location: Location!
    price: Price!
    rating: Float
    availableDates: [String!]!
    category: AttractionCategory!
    images: [String!]!
  }

  type AttractionBooking {
    bookingId: ID!
    status: String!
    attractionId: ID!
    date: String!
    participants: Int!
    totalPrice: Price!
    confirmationCode: String!
  }

  input BookAttractionInput {
    attractionId: ID!
    date: String!
    participants: Int!
    contactEmail: String!
  }

  type Query {
    searchAttractions(location: String!, date: String!, category: String): [Attraction!]!
    getAttraction(id: ID!): Attraction
  }

  type Mutation {
    bookAttraction(input: BookAttractionInput!): AttractionBooking!
  }
`;

module.exports = { typeDefs };
