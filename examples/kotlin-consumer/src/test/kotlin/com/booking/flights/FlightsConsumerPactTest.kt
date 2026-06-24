package com.booking.flights

import au.com.dius.pact.consumer.MockServer
import au.com.dius.pact.consumer.dsl.LambdaDsl.newJsonBody
import au.com.dius.pact.consumer.dsl.PactDslWithProvider
import au.com.dius.pact.consumer.junit5.PactConsumerTestExt
import au.com.dius.pact.consumer.junit5.PactTestFor
import au.com.dius.pact.core.model.V4Pact
import au.com.dius.pact.core.model.annotations.Pact
import com.google.gson.Gson
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith

/**
 * Flights API — Android (Kotlin) Consumer Pact Tests
 *
 * This is what Booking.com's Android team would write using the official
 * Pact JVM library (au.com.dius.pact.consumer:junit5).
 *
 * The generated pact files are identical in structure to the JS consumer
 * tests — Pact is language-agnostic at the contract level. The same
 * PactFlow workspace and provider verification pipeline works regardless
 * of whether the consumer is written in Kotlin, Swift, or JavaScript.
 */
@ExtendWith(PactConsumerTestExt::class)
@PactTestFor(providerName = "booking-flights-api")
class FlightsConsumerPactTest {

    private val client = OkHttpClient()
    private val gson = Gson()

    // ─── Search Flights ───────────────────────────────────────────────────────

    @Pact(consumer = "booking-flights-mobile-consumer")
    fun searchFlightsPact(builder: PactDslWithProvider): V4Pact =
        builder
            .given("flights exist between AMS and LHR on 2025-09-01")
            .uponReceiving("a one-way flight search from AMS to LHR")
                .method("GET")
                .path("/v1/flights/search")
                .queryParameterFromProviderState("origin", "\${origin}", "AMS")
                .matchQuery("destination", "LHR")
                .matchQuery("departureDate", "2025-09-01")
                .matchQuery("passengers", "1")
                .matchQuery("cabinClass", "economy")
                .matchHeader("Authorization", "Bearer .+", "Bearer test-identity-token")
                .matchHeader("x-booking-language", "[a-z]{2}-[A-Z]{2}", "en-US")
                .matchHeader("x-booking-platform", "ios|android", "android")
                .matchHeader("x-booking-client", ".+", "mobile")
            .willRespondWith()
                .status(200)
                .body(newJsonBody { o ->
                    o.minArrayLike("flights", 1) { flight ->
                        flight.stringType("flightId", "AMS-LHR-20250901-001")
                        flight.`object`("origin") { origin ->
                            origin.stringType("iata", "AMS")
                            origin.stringType("name", "Amsterdam Airport Schiphol")
                            origin.stringType("city", "Amsterdam")
                            origin.stringType("country", "NL")
                        }
                        flight.`object`("destination") { dest ->
                            dest.stringType("iata", "LHR")
                            dest.stringType("name", "London Heathrow Airport")
                            dest.stringType("city", "London")
                            dest.stringType("country", "GB")
                        }
                        flight.stringMatcher(
                            "departureTime",
                            "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?(Z|[+-]\\d{4})\$",
                            "2025-09-01T06:30:00+0000"
                        )
                        flight.stringMatcher(
                            "arrivalTime",
                            "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?(Z|[+-]\\d{4})\$",
                            "2025-09-01T07:00:00+0000"
                        )
                        flight.integerType("durationMinutes", 90)
                        flight.`object`("airline") { airline ->
                            airline.stringType("code", "KL")
                            airline.stringType("name", "KLM Royal Dutch Airlines")
                        }
                        flight.`object`("price") { price ->
                            price.decimalType("amount", 149.99)
                            price.stringType("currency", "EUR")
                        }
                        flight.integerType("availableSeats", 42)
                        flight.stringType("cabinClass", "economy")
                    }
                    o.integerType("totalResults", 1)
                }.build())
            .toPact(V4Pact::class.java)

    @Test
    @PactTestFor(pactMethod = "searchFlightsPact")
    fun `search flights returns available flights`(mockServer: MockServer) {
        val request = Request.Builder()
            .url("${mockServer.getUrl()}/v1/flights/search?origin=AMS&destination=LHR&departureDate=2025-09-01&passengers=1&cabinClass=economy")
            .header("Authorization", "Bearer test-identity-token")
            .header("x-booking-language", "en-US")
            .header("x-booking-platform", "android")
            .header("x-booking-client", "mobile")
            .get()
            .build()

        val response = client.newCall(request).execute()
        val body = gson.fromJson(response.body?.string(), Map::class.java)

        assertEquals(200, response.code)
        val flights = body["flights"] as List<*>
        assertTrue(flights.isNotEmpty())
        val firstFlight = flights[0] as Map<*, *>
        val origin = firstFlight["origin"] as Map<*, *>
        assertEquals("AMS", origin["iata"])
    }

    // ─── Get Flight by ID ─────────────────────────────────────────────────────

    @Pact(consumer = "booking-flights-mobile-consumer")
    fun getFlightByIdPact(builder: PactDslWithProvider): V4Pact =
        builder
            .given("flight AMS-LHR-20250901-001 exists")
            .uponReceiving("a request for a specific flight by ID")
                .method("GET")
                .pathFromProviderState("/v1/flights/\${flightId}", "/v1/flights/AMS-LHR-20250901-001")
                .matchHeader("Authorization", "Bearer .+", "Bearer test-identity-token")
                .matchHeader("x-booking-language", "[a-z]{2}-[A-Z]{2}", "en-US")
                .matchHeader("x-booking-platform", "ios|android", "android")
            .willRespondWith()
                .status(200)
                .body(newJsonBody { o ->
                    o.stringType("flightId", "AMS-LHR-20250901-001")
                    o.`object`("origin") { origin ->
                        origin.stringType("iata", "AMS")
                        origin.stringType("name", "Amsterdam Airport Schiphol")
                        origin.stringType("city", "Amsterdam")
                        origin.stringType("country", "NL")
                        origin.stringType("terminal", "2")
                    }
                    o.`object`("destination") { dest ->
                        dest.stringType("iata", "LHR")
                        dest.stringType("name", "London Heathrow Airport")
                        dest.stringType("city", "London")
                        dest.stringType("country", "GB")
                        dest.stringType("terminal", "4")
                    }
                    o.`object`("price") { price ->
                        price.decimalType("amount", 149.99)
                        price.stringType("currency", "EUR")
                    }
                    o.integerType("durationMinutes", 90)
                    o.integerType("availableSeats", 42)
                    o.stringType("cabinClass", "economy")
                }.build())
            .toPact(V4Pact::class.java)

    @Test
    @PactTestFor(pactMethod = "getFlightByIdPact")
    fun `get flight by ID returns full details`(mockServer: MockServer) {
        val request = Request.Builder()
            .url("${mockServer.getUrl()}/v1/flights/AMS-LHR-20250901-001")
            .header("Authorization", "Bearer test-identity-token")
            .header("x-booking-language", "en-US")
            .header("x-booking-platform", "android")
            .get()
            .build()

        val response = client.newCall(request).execute()
        val body = gson.fromJson(response.body?.string(), Map::class.java)

        assertEquals(200, response.code)
        assertEquals("AMS-LHR-20250901-001", body["flightId"])
        val origin = body["origin"] as Map<*, *>
        assertEquals("AMS", origin["iata"])
    }

    // ─── Create Booking ───────────────────────────────────────────────────────

    @Pact(consumer = "booking-flights-mobile-consumer")
    fun createBookingPact(builder: PactDslWithProvider): V4Pact =
        builder
            .given("flight AMS-LHR-20250901-001 exists")
            .given("the user is authenticated and eligible to book")
            .uponReceiving("a request to book a flight")
                .method("POST")
                .path("/v1/bookings")
                .matchHeader("Authorization", "Bearer .+", "Bearer test-identity-token")
                .matchHeader("Content-Type", "application/json.*", "application/json")
                .body(newJsonBody { o ->
                    o.stringType("flightId", "AMS-LHR-20250901-001")
                    o.minArrayLike("passengers", 1) { p ->
                        p.stringType("firstName", "Jan")
                        p.stringType("lastName", "de Vries")
                        p.stringType("dateOfBirth", "1985-03-15")
                        p.stringType("passportNumber", "NL1234567")
                    }
                    o.stringMatcher(
                        "contactEmail",
                        "^[\\w.+-]+@[\\w-]+\\.[a-z]{2,}\$",
                        "jan.devries@example.com"
                    )
                }.build())
            .willRespondWith()
                .status(201)
                .body(newJsonBody { o ->
                    o.stringMatcher("bookingId", "^BK-[A-Z0-9]{8}\$", "BK-ABC12345")
                    o.stringType("status", "CONFIRMED")
                    o.stringType("flightId", "AMS-LHR-20250901-001")
                    o.stringType("confirmationCode", "KL4R2X")
                    o.`object`("totalPrice") { price ->
                        price.decimalType("amount", 149.99)
                        price.stringType("currency", "EUR")
                    }
                    o.integerType("passengerCount", 1)
                    o.stringType("contactEmail", "jan.devries@example.com")
                }.build())
            .toPact(V4Pact::class.java)

    @Test
    @PactTestFor(pactMethod = "createBookingPact")
    fun `create booking returns confirmation`(mockServer: MockServer) {
        val payload = gson.toJson(mapOf(
            "flightId" to "AMS-LHR-20250901-001",
            "passengers" to listOf(mapOf(
                "firstName" to "Jan",
                "lastName" to "de Vries",
                "dateOfBirth" to "1985-03-15",
                "passportNumber" to "NL1234567"
            )),
            "contactEmail" to "jan.devries@example.com"
        ))

        val request = Request.Builder()
            .url("${mockServer.getUrl()}/v1/bookings")
            .header("Authorization", "Bearer test-identity-token")
            .header("Content-Type", "application/json")
            .post(payload.toRequestBody("application/json".toMediaType()))
            .build()

        val response = client.newCall(request).execute()
        val body = gson.fromJson(response.body?.string(), Map::class.java)

        assertEquals(201, response.code)
        assertEquals("CONFIRMED", body["status"])
        assertNotNull(body["bookingId"])
        assertTrue((body["bookingId"] as String).matches(Regex("^BK-[A-Z0-9]{8}$")))
    }
}
