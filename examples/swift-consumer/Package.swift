// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "BookingFlightsConsumer",
    platforms: [.iOS(.v16), .macOS(.v13)],
    dependencies: [
        .package(
            url: "https://github.com/surpher/PactSwift.git",
            from: "1.0.0"
        ),
    ],
    targets: [
        .testTarget(
            name: "BookingFlightsTests",
            dependencies: ["PactSwift"],
            path: "Tests/BookingFlightsTests"
        ),
    ]
)
