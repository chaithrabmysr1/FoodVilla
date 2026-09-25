# FoodVilla

An end-to-end food-delivery web platform — a React web app and Spring Boot
microservices (user, restaurant, food catalogue, order) behind an API Gateway,
with Kafka carrying restaurant events to the order service — built as a
portfolio project demonstrating Java/Spring Boot, microservices, an API
Gateway, JWT auth, event-driven architecture, Docker, React, and SQL.

## Architecture

```
React Web ──►  API Gateway (:8080)  ──►  user / restaurant / catalogue /
                                          order services
                                                 │
                                            Kafka (event bus)
                                                 │
                                    order-service is the single state
                                    owner — restaurant actions reach it
                                    as events
```

Each service owns its own MySQL schema (database-per-service). order-service
is the hub: it owns every order status transition. Restaurant actions arrive
as Kafka events (`foodvilla.restaurant.events`), and order-service publishes
every transition to `foodvilla.order.events` — which nothing in this repo
consumes at the moment.

## Project layout

```
foodVilla_backend/       user / restaurant / catalogue / order services, api-gateway,
                         and a standalone eureka_server (Java 17, Maven)
foodVilla_frontend/      React 18 + Vite web app (customer + admin UI)
docker-compose.yml       Full local environment — see DOCKER.md
PAYMENTS.md              Simulated payment flow (dummy details, no gateway, no real money)
REMOVED_SERVICES.md      What was removed (payment, delivery, notification, mobile) and why
```

## Quickstart — full stack in Docker

```bash
cp .env.example .env
# edit .env: set DB_PASSWORD and JWT_SECRET
docker compose up --build
```

See **[DOCKER.md](DOCKER.md)** for the complete guide — logs, troubleshooting,
running the web app separately, and the difference between Docker-internal
and browser-facing URLs.

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
```

## Order lifecycle

```
CREATED → RESTAURANT_PENDING → RESTAURANT_ACCEPTED → PREPARING →
READY_FOR_PICKUP → OUT_FOR_DELIVERY → DELIVERED
```

Placing an order creates it as `CREATED` with payment `PENDING`. It moves to
`RESTAURANT_PENDING` only when the customer's payment has been recorded server-side
(payment state and order state are tracked separately — see
**[PAYMENTS.md](PAYMENTS.md)**). Payments are simulated: checkout takes dummy UPI /
card / net banking / Paytm / PayPal details, and no real money is ever processed. The restaurant steps
(accept/reject/preparing/ready) are ADMIN actions that flow through Kafka;
`OUT_FOR_DELIVERY` and `DELIVERED` are ADMIN status updates made directly
against `order-service`.

`CANCELLED` is a terminal side-branch. Cancellation is only allowed up
through `RESTAURANT_ACCEPTED` — enforced server-side by `order-service`'s
`OrderStatusTransitionValidator`, not just in the UI.

Orders created while the payment and delivery services existed may still carry
`PAYMENT_*`, `DELIVERY_PARTNER_ASSIGNED` or `PICKED_UP` statuses; those values
remain in the enum so such orders keep loading. See
[REMOVED_SERVICES.md](REMOVED_SERVICES.md).

## Kafka event flow

```
restaurant-service ──publishes──► foodvilla.restaurant.events ──► order-service
                                                                       │
                                                                  publishes
                                                                       ▼
                                                          foodvilla.order.events
                                                          (no consumer in this repo)
```

Duplicate/redelivered events are handled by the order status state machine
itself rejecting already-applied transitions (not a separate dedup table) —
see `order-service`'s `RestaurantEventConsumerTest` for the exact behavior
this relies on.

## Known limitations (stated plainly, not hidden)

- **Payments are simulated** — there is no payment gateway, so no real money moves,
  nothing verifies that any did, and there are no refunds. No keys are needed.
  Details and limits: [PAYMENTS.md](PAYMENTS.md).
- **No restaurant-staff login** — only `USER`/`ADMIN` roles exist. The
  restaurant workflow endpoints and the order status override are
  ADMIN-gated, standing in for a real operator console.
- **Delivery is status-only** — an admin marks an order out for delivery and
  delivered by hand; there is no delivery-partner assignment or tracking.
- See `foodVilla_backend/CONFIGURATION.md` and `DOCKER.md` for the complete,
  current list per area.
