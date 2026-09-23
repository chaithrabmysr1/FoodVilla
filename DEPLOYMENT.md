# Recruiter Demo Deployment — Vercel + Render + Aiven

This documents the specific deployment target for the scoped-down recruiter
demo: **frontend on Vercel, 5 backend services on Render, MySQL on Aiven**.

Not part of this deployment: `payment-service`, `delivery-service`,
`notification-service`, Kafka/Kafka UI, `eureka_server`. Their source code
stays in the repository — see `foodVilla_backend/CONFIGURATION.md` for their
local-dev configuration, which is unaffected by this document.

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
| `KAFKA_BOOTSTRAP_SERVERS` | leave unset — confirmed non-blocking at startup |

**api-gateway**
| Variable | Value |
|---|---|
| `USER_SERVICE_URL` | `https://<user-service-render-url>` — **bare origin, no path** |
| `RESTAURANT_SERVICE_URL` | `https://<restaurant-service-render-url>` — **bare origin** |
| `CATALOGUE_SERVICE_URL` | `https://<foodcatalogue-service-render-url>` — **bare origin** |
| `ORDER_SERVICE_URL` | `https://<order-service-render-url>` — **bare origin** |
| `CORS_ALLOWED_ORIGIN` | your Vercel URL |
| `PAYMENT_SERVICE_URL` / `DELIVERY_SERVICE_URL` / `NOTIFICATION_SERVICE_URL` | leave unset — routes stay defined but unused; nothing in the deployed frontend calls them |

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
- Build settings: Vercel's zero-config Vite detection applies as-is
  (`vite build`, output `dist/`) — nothing else to configure.
- Once you have the real Vercel URL, go back and set `CORS_ALLOWED_ORIGIN`
  on **api-gateway only** — that's the sole place `globalcors` actually
  reads it. The 4 backend services no longer consume this variable (see the
  per-service tables above), so setting it there has no effect.

## What's intentionally excluded from this deployment

`payment-service`, `delivery-service`, `notification-service`, and Kafka are
not deployed. The recruiter-facing flow (signup/login → browse restaurants →
view food items → add to cart → place order → view order history) does not
call any of them — confirmed by inspecting the frontend's service imports.
`Checkout.jsx` creates the order directly with no payment step, and displays
a demo notice rather than claiming a payment was processed. Their source
code remains in the repository, unmodified, for future phases.
