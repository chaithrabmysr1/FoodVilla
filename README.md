# FoodVilla

An end-to-end food-delivery platform — React web, React Native mobile, and
8 Spring Boot microservices communicating over Kafka — built as a portfolio
project demonstrating Java/Spring Boot, microservices, an API Gateway, JWT
auth, event-driven architecture, Docker, React, React Native, and SQL.

## Architecture

```
React Web  ──┐
             ├──►  API Gateway (:8080)  ──►  user / restaurant / catalogue /
React Native ┘                               order / payment / delivery /
                                               notification services
                                                      │
                                                 Kafka (event bus)
                                                      │
                                          order-service is the single state
                                          owner — every other service reacts
                                          to or publishes an event through it
```

Each service owns its own MySQL schema (database-per-service). order-service
is the hub: it's the only service every status transition ultimately flows
through and the only one every other service needs to consume events from
(`foodvilla.order.events`) to know "what happened."

## Project layout

```
foodVilla_backend/       8 Spring Boot services + api-gateway (Java 17, Maven)
foodVilla_frontend/      React 18 + Vite web app (customer + admin UI)
foodvilla-mobile/        React Native (Expo, TypeScript) customer app
docker-compose.yml       Full local environment — see DOCKER.md
```

## Quickstart — full stack in Docker

```bash
cp .env.example .env
# edit .env: set DB_PASSWORD and JWT_SECRET
docker compose up --build
```

See **[DOCKER.md](DOCKER.md)** for the complete guide — logs, troubleshooting,
running web/mobile separately, Android emulator vs. physical device
networking, and the difference between Docker-internal and browser-facing
URLs.

## Quickstart — without Docker

Each piece can run independently against a local MySQL + Kafka install; see
**[foodVilla_backend/CONFIGURATION.md](foodVilla_backend/CONFIGURATION.md)**
for every environment variable each service reads (required and optional,
with defaults).

```bash
# Backend (repeat per service — user-service, restaurant-service, etc.)
export DB_PASSWORD='...'
export JWT_SECRET='...'
cd foodVilla_backend/user-service && ./mvnw spring-boot:run

# Web
cd foodVilla_frontend/foodvilla_frontend && npm install && npm run dev

# Mobile
cd foodvilla-mobile && npm install && npx expo start
```

## Order lifecycle

```
CREATED → PAYMENT_PENDING → PAYMENT_CONFIRMED → RESTAURANT_PENDING →
RESTAURANT_ACCEPTED → PREPARING → READY_FOR_PICKUP →
DELIVERY_PARTNER_ASSIGNED → PICKED_UP → OUT_FOR_DELIVERY → DELIVERED
```

`CANCELLED` and `PAYMENT_FAILED` are terminal side-branches. Cancellation is
only allowed up through `RESTAURANT_ACCEPTED` — enforced server-side by
`order-service`'s `OrderStatusTransitionValidator`, not just in the UI.

## Kafka event flow

`order-service` is both the primary consumer and the primary publisher:

```
payment-service ──publishes──► foodvilla.payment.events ──┐
restaurant-service ─publishes─► foodvilla.restaurant.events ─┼─► order-service ──publishes──► foodvilla.order.events ──► notification-service
delivery-service ──publishes─► foodvilla.delivery.events ──┘                                                            (in-app notifications, live via SSE on web)
```

Duplicate/redelivered events are handled by the order status state machine
itself rejecting already-applied transitions (not a separate dedup table) —
see `order-service`'s `RestaurantEventConsumerTest` for the exact behavior
this relies on.

## Known limitations (stated plainly, not hidden)

- **Razorpay integration is real code, not tested against a live account** —
  local development uses `PAYMENT_PROVIDER=mock` by default, which is fully
  functional and Kafka-event-driven. Verify Razorpay yourself with test-mode
  keys before relying on it.
- **No restaurant-staff or delivery-partner login** — only `USER`/`ADMIN`
  roles exist. Restaurant workflow and delivery-service endpoints are
  ADMIN-gated, standing in for a real operator console.
- **Mobile has no real-time push** — React Native has no native
  `EventSource`; mobile polls for order status and notifications where web
  uses a live SSE stream. Push notification registration code exists but no
  push provider is wired up on the backend yet.
- See `foodVilla_backend/CONFIGURATION.md`, `DOCKER.md`, and
  `foodvilla-mobile/README.md` for the complete, current list per area.
