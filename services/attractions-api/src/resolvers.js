const { searchAttractions, getAttractionById, createAttractionBooking } = require('./data/attractions');
const { GraphQLError } = require('graphql');

const resolvers = {
  Query: {
    searchAttractions: (_, { location, date, category }) => {
      return searchAttractions({ location, date, category });
    },

    getAttraction: (_, { id }) => {
      return getAttractionById(id);
    },
  },

  Mutation: {
    bookAttraction: (_, { input }, context) => {
      // Require auth on mutations
      if (!context.identityToken) {
        throw new GraphQLError('A valid identity token is required', {
          extensions: { code: 'UNAUTHORIZED' },
        });
      }

      const booking = createAttractionBooking(input);
      if (!booking) {
        throw new GraphQLError(`Attraction ${input.attractionId} not found`, {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return booking;
    },
  },
};

module.exports = { resolvers };
