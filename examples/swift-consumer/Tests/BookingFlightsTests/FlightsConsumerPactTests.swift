import PactSwift
import XCTest

/**
 * Flights API — iOS (Swift) Consumer Pact Tests
 *
 * This is what Booking.com's iOS team would write using PactSwift,
 * the official Swift Pact consumer library backed by the Pact FFI (Rust core).
 *
 * The generated pact files are structurally identical to the Kotlin and JS
 * consumer tests — Pact is language-agnostic at the contract level. The same
 * PactFlow workspace and provider verification pipeline works regardless of
 * whether the consumer is Kotlin, Swift, or JavaScript.
 *
 * Run locally:
 *   swift test
 *
 * Pact files are written to $(PROJECT_DIR)/pacts/ and published to PactFlow
 * in the consumer CI workflow.
 */
final class FlightsConsumerPactTests: XCTestCase {

    // One MockService per test class — PactSwift reuses the Rust mock server
    var mockService = MockService(
        consumer: "booking-flights-mobile-consumer",
        provider: "booking-flights-api",
        scheme: .http
    )

    // ─── Search Flights ───────────────────────────────────────────────────────

    func testSearchFlights() {
        mockService
            .given("flights exist between AMS and LHR on 2025-09-01")
            .uponReceiving("a one-way flight search from AMS to LHR")
            .withRequest(
                method: .GET,
                path: "/v1/flights/search",
                query: [
                    "origin":        [ExactMatch("AMS")],
                    "destination":   [ExactMatch("LHR")],
                    "departureDate": [ExactMatch("2025-09-01")],
                    "passengers":    [ExactMatch("1")],
                    "cabinClass":    [ExactMatch("economy")],
                ],
                headers: [
                    "Authorization":       RegexLike("Bearer .+", generate: "Bearer test-identity-token"),
                    "x-booking-language":  RegexLike("[a-z]{2}-[A-Z]{2}", generate: "en-US"),
                    "x-booking-platform":  RegexLike("ios|android", generate: "ios"),
                    "x-booking-client":    SomethingLike("mobile"),
                ]
            )
            .willRespondWith(
                status: 200,
                body: [
                    "flights": EachLike([
                        "flightId":        SomethingLike("AMS-LHR-20250901-001"),
                        "origin": [
                            "iata":    SomethingLike("AMS"),
                            "name":    SomethingLike("Amsterdam Airport Schiphol"),
                            "city":    SomethingLike("Amsterdam"),
                            "country": SomethingLike("NL"),
                        ] as [String: AnyMatcher],
                        "destination": [
                            "iata":    SomethingLike("LHR"),
                            "name":    SomethingLike("London Heathrow Airport"),
                            "city":    SomethingLike("London"),
                            "country": SomethingLike("GB"),
                        ] as [String: AnyMatcher],
                        "departureTime": RegexLike(
                            #"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{4})$"#,
                            generate: "2025-09-01T06:30:00+0000"
                        ),
                        "arrivalTime": RegexLike(
                            #"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{4})$"#,
                            generate: "2025-09-01T07:00:00+0000"
                        ),
                        "durationMinutes": IntegerLike(90),
                        "airline": [
                            "code": SomethingLike("KL"),
                            "name": SomethingLike("KLM Royal Dutch Airlines"),
                        ] as [String: AnyMatcher],
                        "price": [
                            "amount":   DecimalLike(149.99),
                            "currency": SomethingLike("EUR"),
                        ] as [String: AnyMatcher],
                        "availableSeats": IntegerLike(42),
                        "cabinClass":     SomethingLike("economy"),
                    ] as [String: AnyMatcher]),
                    "totalResults": IntegerLike(1),
                ]
            )

        mockService.run { [weak self] baseURL, done in
            guard let self else { return }

            var components = URLComponents(string: "\(baseURL)/v1/flights/search")!
            components.queryItems = [
                URLQueryItem(name: "origin", value: "AMS"),
                URLQueryItem(name: "destination", value: "LHR"),
                URLQueryItem(name: "departureDate", value: "2025-09-01"),
                URLQueryItem(name: "passengers", value: "1"),
                URLQueryItem(name: "cabinClass", value: "economy"),
            ]

            var request = URLRequest(url: components.url!)
            request.setValue("Bearer test-identity-token", forHTTPHeaderField: "Authorization")
            request.setValue("en-US", forHTTPHeaderField: "x-booking-language")
            request.setValue("ios", forHTTPHeaderField: "x-booking-platform")
            request.setValue("mobile", forHTTPHeaderField: "x-booking-client")

            URLSession.shared.dataTask(with: request) { data, response, _ in
                let http = response as! HTTPURLResponse
                let json = try! JSONSerialization.jsonObject(with: data!) as! [String: Any]
                let flights = json["flights"] as! [[String: Any]]

                XCTAssertEqual(http.statusCode, 200)
                XCTAssertFalse(flights.isEmpty)
                let origin = flights[0]["origin"] as! [String: Any]
                XCTAssertEqual(origin["iata"] as? String, "AMS")
                done()
            }.resume()
        }
    }

    // ─── Get Flight by ID ─────────────────────────────────────────────────────

    func testGetFlightById() {
        mockService
            .given("flight AMS-LHR-20250901-001 exists")
            .uponReceiving("a request for a specific flight by ID")
            .withRequest(
                method: .GET,
                path: "/v1/flights/AMS-LHR-20250901-001",
                headers: [
                    "Authorization":      RegexLike("Bearer .+", generate: "Bearer test-identity-token"),
                    "x-booking-language": RegexLike("[a-z]{2}-[A-Z]{2}", generate: "en-US"),
                    "x-booking-platform": RegexLike("ios|android", generate: "ios"),
                ]
            )
            .willRespondWith(
                status: 200,
                body: [
                    "flightId": SomethingLike("AMS-LHR-20250901-001"),
                    "origin": [
                        "iata":     SomethingLike("AMS"),
                        "name":     SomethingLike("Amsterdam Airport Schiphol"),
                        "city":     SomethingLike("Amsterdam"),
                        "country":  SomethingLike("NL"),
                        "terminal": SomethingLike("2"),
                    ] as [String: AnyMatcher],
                    "destination": [
                        "iata":     SomethingLike("LHR"),
                        "name":     SomethingLike("London Heathrow Airport"),
                        "city":     SomethingLike("London"),
                        "country":  SomethingLike("GB"),
                        "terminal": SomethingLike("4"),
                    ] as [String: AnyMatcher],
                    "price": [
                        "amount":   DecimalLike(149.99),
                        "currency": SomethingLike("EUR"),
                    ] as [String: AnyMatcher],
                    "durationMinutes": IntegerLike(90),
                    "availableSeats":  IntegerLike(42),
                    "cabinClass":      SomethingLike("economy"),
                ]
            )

        mockService.run { baseURL, done in
            var request = URLRequest(url: URL(string: "\(baseURL)/v1/flights/AMS-LHR-20250901-001")!)
            request.setValue("Bearer test-identity-token", forHTTPHeaderField: "Authorization")
            request.setValue("en-US", forHTTPHeaderField: "x-booking-language")
            request.setValue("ios", forHTTPHeaderField: "x-booking-platform")

            URLSession.shared.dataTask(with: request) { data, response, _ in
                let http = response as! HTTPURLResponse
                let json = try! JSONSerialization.jsonObject(with: data!) as! [String: Any]

                XCTAssertEqual(http.statusCode, 200)
                XCTAssertEqual(json["flightId"] as? String, "AMS-LHR-20250901-001")
                let origin = json["origin"] as! [String: Any]
                XCTAssertEqual(origin["iata"] as? String, "AMS")
                done()
            }.resume()
        }
    }

    // ─── Create Booking ───────────────────────────────────────────────────────

    func testCreateBooking() {
        mockService
            .given("flight AMS-LHR-20250901-001 exists")
            .given("the user is authenticated and eligible to book")
            .uponReceiving("a request to book a flight")
            .withRequest(
                method: .POST,
                path: "/v1/bookings",
                headers: [
                    "Authorization":  RegexLike("Bearer .+", generate: "Bearer test-identity-token"),
                    "Content-Type":   SomethingLike("application/json"),
                ],
                body: [
                    "flightId": SomethingLike("AMS-LHR-20250901-001"),
                    "passengers": EachLike([
                        "firstName":      SomethingLike("Jan"),
                        "lastName":       SomethingLike("de Vries"),
                        "dateOfBirth":    SomethingLike("1985-03-15"),
                        "passportNumber": SomethingLike("NL1234567"),
                    ] as [String: AnyMatcher]),
                    "contactEmail": RegexLike(
                        #"^[\w.+-]+@[\w-]+\.[a-z]{2,}$"#,
                        generate: "jan.devries@example.com"
                    ),
                ]
            )
            .willRespondWith(
                status: 201,
                body: [
                    "bookingId":       RegexLike(#"^BK-[A-Z0-9]{8}$"#, generate: "BK-ABC12345"),
                    "status":          SomethingLike("CONFIRMED"),
                    "flightId":        SomethingLike("AMS-LHR-20250901-001"),
                    "confirmationCode": SomethingLike("KL4R2X"),
                    "totalPrice": [
                        "amount":   DecimalLike(149.99),
                        "currency": SomethingLike("EUR"),
                    ] as [String: AnyMatcher],
                    "passengerCount": IntegerLike(1),
                    "contactEmail":   SomethingLike("jan.devries@example.com"),
                ]
            )

        mockService.run { baseURL, done in
            let payload: [String: Any] = [
                "flightId": "AMS-LHR-20250901-001",
                "passengers": [[
                    "firstName": "Jan",
                    "lastName": "de Vries",
                    "dateOfBirth": "1985-03-15",
                    "passportNumber": "NL1234567",
                ]],
                "contactEmail": "jan.devries@example.com",
            ]

            var request = URLRequest(url: URL(string: "\(baseURL)/v1/bookings")!)
            request.httpMethod = "POST"
            request.setValue("Bearer test-identity-token", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try! JSONSerialization.data(withJSONObject: payload)

            URLSession.shared.dataTask(with: request) { data, response, _ in
                let http = response as! HTTPURLResponse
                let json = try! JSONSerialization.jsonObject(with: data!) as! [String: Any]

                XCTAssertEqual(http.statusCode, 201)
                XCTAssertEqual(json["status"] as? String, "CONFIRMED")
                let bookingId = json["bookingId"] as! String
                XCTAssertTrue(bookingId.hasPrefix("BK-"))
                done()
            }.resume()
        }
    }
}
