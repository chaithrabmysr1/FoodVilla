# Running FoodVilla with Docker Compose

One command brings up the complete backend: MySQL, Kafka, all 8 Spring Boot
services, and (optionally) a production-style build of the web frontend
behind nginx.

## Prerequisites

- Docker Desktop running (check the whale icon says "Docker Desktop is
  running" — a hung/starting daemon will make every command below hang
  instead of failing cleanly, which is worth knowing before you assume
  something in this repo is broken).
- Nothing else already bound to ports 3306, 5173, 8080–8087, 8090, 29092.

## Quickstart

```bash
cp .env.example .env
# edit .env — set a real DB_PASSWORD and JWT_SECRET (32+ random characters)

docker compose up --build
```

First run takes a few minutes (Maven builds all 8 services from source, no
layer cache yet). Subsequent runs are much faster.

Once it's up:

| What | URL |
|---|---|
| API Gateway (everything goes through here) | http://localhost:8080 |
| Web frontend (if you built the `web` service) | http://localhost:5173 |
| Kafka UI (inspect topics/messages) | http://localhost:8090 |
| MySQL (for a GUI client) | localhost:3306 |
| Kafka (host-accessible listener, for local tools/non-Docker services) | localhost:29092 |

## Common commands

```bash
# Start everything, rebuilding images if source changed
docker compose up --build

# Start in the background
docker compose up --build -d

# Stop everything (keeps data — volumes survive)
docker compose down

# Stop everything AND wipe MySQL/Kafka data — use this to reset to a
# completely clean state (e.g. after changing schema/topic config)
docker compose down -v

# Start only specific services (+ their dependencies)
docker compose up --build mysql kafka user-service

# Rebuild one service after a code change, without restarting everything
docker compose up --build order-service
```

## Logs

```bash
# Follow one service
docker compose logs -f order-service
docker compose logs -f api-gateway
docker compose logs -f payment-service

# Follow everything
docker compose logs -f

# Kafka broker's own logs (startup, listener binding, topic creation)
docker compose logs -f kafka

# Or inspect topics/messages visually instead of grepping logs:
# open http://localhost:8090 once containers are up
```

Each service logs its own startup (Spring Boot banner + "Started
XxxApplication"), DB connection (Hibernate dialect resolution — an error
here means MySQL wasn't ready or credentials are wrong), and Kafka
connection (`spring.kafka` consumer/producer factory logs). Application
logs (`com.example.foodVilla.*` at DEBUG) show order creation, payment
confirmation, restaurant/delivery status changes, and notification
processing — but never JWTs, passwords, or Razorpay secrets; nothing in
this codebase logs those.

## Environment variables

`docker-compose.yml` reads from a `.env` file in the repo root (see
`.env.example` for every variable it uses). This is a *separate*
configuration surface from running services outside Docker — see
`foodVilla_backend/CONFIGURATION.md` for the full per-service breakdown,
including the "same variable name, different shape" gotcha
(`RESTAURANT_SERVICE_URL`/`CATALOGUE_SERVICE_URL`/`ORDER_SERVICE_URL` mean
different things depending on which service reads them). Inside
`docker-compose.yml` each container already gets the correct
Docker-network-shaped value hardcoded — you don't need to think about that
gotcha unless you're changing the compose file itself.

## Docker-internal URLs vs. browser/mobile URLs — do not mix these up

Inside `docker-compose.yml`, services talk to each other using **Docker
service names** (`http://user-service:8081`, `http://kafka:9092`, etc.) —
these hostnames only resolve *inside* the `foodvilla` Docker network.

Your **browser** (running the web app) and your **phone/emulator** (running
the mobile app) are outside that network entirely. They must always use a
**host-reachable** address:

- Web dev server (`npm run dev`, outside Docker): `VITE_API_BASE_URL=http://localhost:8080`
- Web production build (the `web` service in compose): baked in at build
  time via the `VITE_API_BASE_URL` build arg — defaults to
  `http://localhost:8080`, already correct for local Docker use.
- Mobile: see `foodvilla-mobile/README.md`'s Networking section
  (`10.0.2.2` for Android emulator, LAN IP for a physical device, etc.) —
  unchanged by this phase, still applies identically whether the backend
  runs in Docker or via `mvn spring-boot:run`.

If you ever see `http://api-gateway:8080` in a browser or mobile network
error, that's the bug this section exists to prevent — a browser/phone can
never resolve a Docker Compose service name.

## Running the web frontend separately (outside Docker)

The `web` compose service is an optional production-style preview — for
actual development, keep using the fast Vite dev server exactly as before:

```bash
cd foodVilla_frontend/foodvilla_frontend
npm install    # first time only
npm run dev
```

Point its `.env`'s `VITE_API_BASE_URL` at `http://localhost:8080` (the
Dockerized Gateway) or at a locally-running Gateway (`mvn spring-boot:run`
in `foodVilla_backend/api-gateway`) — both work identically from the
browser's perspective.

## Running the mobile app separately

Mobile is never containerized (React Native apps don't run "in Docker" the
way a server does) — it always runs via Expo, against whichever backend
you point it at:

```bash
cd foodvilla-mobile
npm install    # first time only
npx expo start
```

### Connecting to the Dockerized (or locally-run) backend

Set `foodvilla-mobile/.env`'s `EXPO_PUBLIC_API_BASE_URL` based on where the
Expo app is actually running — full explanation and a table of every case
in `foodvilla-mobile/README.md`'s Networking section. Summary:

- **Android Emulator**: `http://10.0.2.2:8080` (the emulator's special
  alias for your host machine's `localhost` — NOT the same as
  `localhost:8080`, which inside the emulator refers to the emulator
  itself).
- **iOS Simulator**: `http://localhost:8080` (shares the host Mac's
  network namespace, so plain `localhost` works).
- **Physical device on the same Wi-Fi**: `http://<your-machine-LAN-IP>:8080`
  — find your LAN IP with `ipconfig getifaddr en0` (macOS, Wi-Fi) and put
  that in `.env`. This repo intentionally does not hardcode anyone's
  personal LAN IP.

After editing `.env`, restart `npx expo start` — Expo inlines
`EXPO_PUBLIC_*` variables at bundle time, so a running dev server won't
pick up the change until restarted.

## Kafka topics

Auto-created on first publish/subscribe (development-friendly default) —
no manual provisioning needed locally:

- `foodvilla.order.events` — order-service publishes on every status
  transition; notification-service is the main consumer.
- `foodvilla.payment.events` — payment-service publishes; order-service
  consumes.
- `foodvilla.restaurant.events` — restaurant-service publishes;
  order-service consumes.
- `foodvilla.delivery.events` — delivery-service publishes; order-service
  consumes.

Inspect them live at http://localhost:8090 (kafka-ui) once containers are
up, or from the host machine with any Kafka CLI tool pointed at
`localhost:29092`.

## Troubleshooting

- **A service's healthcheck never turns healthy** — check its logs first
  (`docker compose logs -f <service>`). The most common cause is MySQL not
  being ready yet on first boot (schema creation via
  `foodVilla_backend/db-init/01-create-databases.sql` + each service's own
  `ddl-auto=update` table creation can take a few extra seconds the very
  first time).
- **Kafka client connection errors from a service** — confirm `kafka`'s
  healthcheck is green first; a service starting before Kafka is fully up
  will retry in the background (Spring Kafka's default behavior) rather
  than crash, so this usually self-resolves within the `start_period`.
- **"Access denied" from MySQL** — you changed `DB_PASSWORD` in `.env`
  after the `mysql-data` volume was already initialized with the old one.
  MySQL only applies `MYSQL_ROOT_PASSWORD` on first initialization of an
  empty data directory. Fix: `docker compose down -v` (wipes the volume)
  and start fresh.
- **Docker commands hang indefinitely instead of erroring** — Docker
  Desktop's backend is likely stuck rather than "still starting." Quit it
  completely (not just close the window) and reopen it.
