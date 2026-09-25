# Recruiter Demo Deployment — Vercel + Render + Aiven

This documents the specific deployment target for the scoped-down recruiter
demo: **frontend on Vercel, 5 backend services on Render, MySQL on Aiven**.

Not part of this deployment: Kafka/Kafka UI, `eureka_server`. Their source
code (where the repo has any) stays in the repository — see
`foodVilla_backend/CONFIGURATION.md` for local-dev configuration, which is
unaffected by this document. The former `payment-service`, `delivery-service`
and `notification-service` no longer exist; see `REMOVED_SERVICES.md`. Payments
are back as a **simulated** payment inside `order-service` — no new service to deploy
and no keys to set; see [PAYMENTS.md](PAYMENTS.md). It is a demo: no real money is
processed.

## Architecture

```
Vercel (React frontend)
        |
        v
Render: api-gateway
        |
        +--> Render: user-service
        +--> Render: restaurant-service
        +--> Render: foodcatalogue-service --> restaurant-service
        +--> Render: order-service --> foodcatalogue-service
        |
        v
Aiven: one free MySQL service, 4 databases
  (foodvilla_userService, foodvilla_restaurantService,
   foodvilla_foodCatalogueService, foodvilla_orderService)
```

## Database — Aiven for MySQL (free tier)

One free Aiven MySQL **service** (1GB RAM, 1GB disk, 76 max connections, no
credit card, no expiry — Aiven may power off an inactive free service with
notice first). Create the 4 databases below inside that single service
(Aiven's console: service → Databases → Create database; or connect with any
MySQL client and run `CREATE DATABASE`):

- `foodvilla_userService`
- `foodvilla_restaurantService`
- `foodvilla_foodCatalogueService`
- `foodvilla_orderService`

All 4 backend services below point at the **same** Aiven host/port/username/
password — only the database name in `DB_URL` differs per service, exactly
like the local multi-schema setup already in `CONFIGURATION.md`.

Aiven gives you a single `DB_PASSWORD`-equivalent (the service's root/admin
password) and one host:port — copy those into every service's `DB_URL`/
`DB_USERNAME`/`DB_PASSWORD` below, changing only the database name in the URL.

## Render — deployment order

Deploy in this order; each step after the first needs the previous step's
live Render URL to fill in its own environment variables.

All 5 are a Render **Web Service**, **Runtime: Docker**. Render assigns
`PORT` automatically — every service already reads `${PORT:...}`, so no
manual port configuration is needed anywhere in this table.

| Order | Service | Root directory | Dockerfile |
|---|---|---|---|
| 1 | user-service | `foodVilla_backend/user-service` | `Dockerfile` |
| 2 | restaurant-service | `foodVilla_backend/restaurant-service` | `Dockerfile` |
| 3 | foodcatalogue-service | `foodVilla_backend/foodcatalogue-service` | `Dockerfile` |
| 4 | order-service | `foodVilla_backend/order-service` | `Dockerfile` |
| 5 | api-gateway | `foodVilla_backend/api-gateway` | `Dockerfile` |

### Environment variables per service

**user-service**
| Variable | Value |
|---|---|
| `DB_URL` | `jdbc:mysql://<aiven-host>:<aiven-port>/foodvilla_userService` |
| `DB_USERNAME` | Aiven username |
| `DB_PASSWORD` | Aiven password |
| `JWT_SECRET` | same long random value across all 4 services below |
| `CORS_ALLOWED_ORIGIN` | optional/inert — this service's `@CrossOrigin` was removed when CORS was centralized at api-gateway; nothing in its code reads `cors.allowed.origin` anymore. Safe to leave unset. |

**restaurant-service**
| Variable | Value |
|---|---|
| `DB_URL` | `jdbc:mysql://<aiven-host>:<aiven-port>/foodvilla_restaurantService` |
| `DB_USERNAME` / `DB_PASSWORD` | same Aiven credentials |
| `JWT_SECRET` | same value as user-service |
| `CORS_ALLOWED_ORIGIN` | optional/inert — not consumed by this service's code anymore (see note under user-service). Safe to leave unset. |
| `KAFKA_BOOTSTRAP_SERVERS` | leave unset — publisher-only, degrades safely without a broker |

**foodcatalogue-service**
| Variable | Value |
|---|---|
| `DB_URL` | `jdbc:mysql://<aiven-host>:<aiven-port>/foodvilla_foodCatalogueService` |
| `DB_USERNAME` / `DB_PASSWORD` | same Aiven credentials |
| `JWT_SECRET` | same value as user-service |
| `CORS_ALLOWED_ORIGIN` | optional/inert — not consumed by this service's code anymore (see note under user-service). Safe to leave unset. |
| `RESTAURANT_SERVICE_URL` | `https://<restaurant-service-render-url>/api/restaurants/` — **full path, trailing slash** |

**order-service**
| Variable | Value |
|---|---|
| `DB_URL` | `jdbc:mysql://<aiven-host>:<aiven-port>/foodvilla_orderService` |
| `DB_USERNAME` / `DB_PASSWORD` | same Aiven credentials |
| `JWT_SECRET` | same value as user-service |
| `CORS_ALLOWED_ORIGIN` | optional/inert — not consumed by this service's code anymore (see note under user-service). Safe to leave unset. |
| `CATALOGUE_SERVICE_URL` | `https://<foodcatalogue-service-render-url>/api/catalogue/` — **full path, trailing slash** |
| `ORDER_DELIVERY_FEE` / `ORDER_TAX_RATE` | optional, defaults are fine (`40` / `0.05`) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | no longer read — payments are simulated and need no keys. Delete them from Render if you had set them. |
| `PAYMENT_PENDING_ORDER_TTL_MINUTES` | optional (default `30`) — how long an unpaid order can still be paid |
| `KAFKA_BOOTSTRAP_SERVERS` | leave unset — confirmed non-blocking at startup |

**api-gateway**
| Variable | Value |
|---|---|
| `USER_SERVICE_URL` | `https://<user-service-render-url>` — **bare origin, no path** |
| `RESTAURANT_SERVICE_URL` | `https://<restaurant-service-render-url>` — **bare origin** |
| `CATALOGUE_SERVICE_URL` | `https://<foodcatalogue-service-render-url>` — **bare origin** |
| `ORDER_SERVICE_URL` | `https://<order-service-render-url>` — **bare origin** |
| `CORS_ALLOWED_ORIGIN` | your Vercel URL |
| `PAYMENT_SERVICE_URL` / `DELIVERY_SERVICE_URL` / `NOTIFICATION_SERVICE_URL` | no longer read — those routes were removed from the gateway. Delete them from Render if you had set them. |

### Same variable name, different required shape — read this twice before filling in values

`RESTAURANT_SERVICE_URL` and `CATALOGUE_SERVICE_URL` each mean **two
different things** depending on which service reads them:

- To **foodcatalogue-service** (`RESTAURANT_SERVICE_URL`) and
  **order-service** (`CATALOGUE_SERVICE_URL`): the **full REST path**,
  including the trailing `/api/...` segment and trailing slash — an ID gets
  appended directly to this string.
- To **api-gateway**: the **bare origin only** — no path — because the
  gateway forwards the incoming request path unchanged.

Setting the same value in both places will break one of them silently (wrong
path → 404, or double path segments). Each Render service has its own
independent environment, so there's no risk of them overwriting each other —
just be careful when copy-pasting.

### Known limitation (not a blocker)

Render's free web services sleep after 15 minutes of no inbound traffic and
take roughly 30-60 seconds to wake on the next request. With 5 independent
free services here, a recruiter's first click after idle time may trigger
several sequential cold starts. No action needed — just don't be surprised
by a slow first load.

## Vercel

- **`VITE_API_BASE_URL`** = the deployed api-gateway's Render URL (e.g.
  `https://foodvilla-api-gateway.onrender.com`). This is the only backend URL
  the frontend needs — confirmed via `src/services/apiClient.js`.
- **SPA routing:** `foodVilla_frontend/foodvilla_frontend/vercel.json`
  (created alongside this doc) rewrites every path to `/index.html` so
  `BrowserRouter` routes like `/restaurant/5` or `/orders/12` survive a
  direct load or refresh instead of 404ing.
- **Payments: nothing to set on Vercel.** They are simulated by order-service; the
  frontend loads no third-party payment script and needs no payment variable.
- Build settings: Vercel's zero-config Vite detection applies as-is
  (`vite build`, output `dist/`) — nothing else to configure.
- Once you have the real Vercel URL, go back and set `CORS_ALLOWED_ORIGIN`
  on **api-gateway only** — that's the sole place `globalcors` actually
  reads it. The 4 backend services no longer consume this variable (see the
  per-service tables above), so setting it there has no effect.

## Payments on this deployment (simulated)

Full detail — flow, API, rules, limitations — is in [PAYMENTS.md](PAYMENTS.md).
Deployment-specific points:

- **Portfolio demo, not a payment system.** There is no payment gateway: checkout
  takes dummy UPI / card / net banking / Paytm / PayPal details and the backend marks
  the order paid. No real money moves and nothing verifies that any did. Do not present
  it as real payments.
- **Nothing to configure.** No keys on Render or Vercel. Just redeploy **order-service**
  (and the web app). The gateway already routes `/api/orders/**`.
- **Existing database:** on first start with this build, `ddl-auto: update` adds two
  **nullable** columns to `orders` (`payment_method`, `payment_detail`). Nothing is
  dropped or rewritten and existing orders load unchanged. `payment_status` is not
  altered (it stays a MySQL enum, which is why the paid value is `CONFIRMED`; see
  PAYMENTS.md). A `razorpay_order_id` column left by the earlier Razorpay build is
  nullable, unused, and can stay.
- **Behaviour to expect:** an order is not sent to the restaurant when it is placed. It
  stays `CREATED` until it is paid. Orders already in your database that are `CREATED`
  and unpaid will read "Payment expired" once older than 30 minutes; an admin can cancel
  them or move them on ("Force status").
- **The public site takes dummy details only.** The card number and CVV stay in the
  visitor's browser and only a masked label (`Visa •••• 1111`) reaches the server, but
  the form looks like a real one — anyone who types a real card number there is
  typing it into a page that does nothing with it.

## What's intentionally excluded from this deployment

`eureka_server` and Kafka are not required for the recruiter-facing flow
(signup/login → browse restaurants → view food items → add to cart → checkout → pay with
dummy details → view order history): when the payment is recorded, `order-service` moves
the order to `RESTAURANT_PENDING` synchronously, so no consumer has to act for it to
reach the restaurant queue. `payment-service`, `delivery-service` and
`notification-service` have been removed from the repository; see `REMOVED_SERVICES.md`.

Orders created before this change and left at `CREATED` on the deployed database are
unpaid; an admin can cancel them or move them on from the admin order page
("Force status").
