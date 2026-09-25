# Backend local configuration

This project reads secrets from environment variables rather than from
tracked `application.yml` files. No default value is committed for any of
them, so each service will fail fast at startup with a clear error if the
required variable is missing — this is intentional.

## Required environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `DB_PASSWORD` | `user-service`, `restaurant-service`, `foodcatalogue-service`, `order-service` | MySQL password for the local `root` user (all four services connect to the same local MySQL instance, in separate schemas). |
| `JWT_SECRET` | `user-service`, `restaurant-service`, `foodcatalogue-service`, `order-service` | HMAC-SHA256 signing key for issuing (`user-service`) or validating (the other three) JWTs. Use a long, random string (32+ characters) — never reuse an example or previously-committed value. Since `user-service` login now issues a `userId` claim alongside `role`, keep the secret identical across all four services or tokens will fail validation. |

`eureka_server` does not require any secret. `api-gateway` (routing only, does not validate JWTs) does not require `JWT_SECRET` either.

## Optional environment variables (sensible localhost defaults)

| Variable | Used by | Default | Meaning |
|---|---|---|---|
| `RESTAURANT_SERVICE_URL` | `foodcatalogue-service` | `http://localhost:8082/api/restaurants/` | **Full path** to restaurant-service's REST API (trailing slash — an id is appended). |
| `RESTAURANT_SERVICE_URL` | `api-gateway` | `http://localhost:8082` | **Bare origin** for restaurant-service — the gateway forwards the incoming request path unchanged, so no path suffix. |
| `CATALOGUE_SERVICE_URL` | `order-service` | `http://localhost:8083/api/catalogue/` | **Full path** to foodcatalogue-service's aggregate endpoint (trailing slash — a restaurant id is appended). Used at order-creation time to snapshot authoritative item names/prices. |
| `CATALOGUE_SERVICE_URL` | `api-gateway` | `http://localhost:8083` | **Bare origin** for foodcatalogue-service. |
| `USER_SERVICE_URL` | `api-gateway` | `http://localhost:8081` | Bare origin for user-service. |
| `ORDER_SERVICE_URL` | `api-gateway` | `http://localhost:8084` | Bare origin for order-service. |
| `ORDER_DELIVERY_FEE` | `order-service` | `40` | Flat delivery fee (₹) added to every order. Placeholder until a real fee engine exists. |
| `ORDER_TAX_RATE` | `order-service` | `0.05` | Flat tax rate applied to the item subtotal. Placeholder until real tax rules exist. |
| `PAYMENT_PENDING_ORDER_TTL_MINUTES` | `order-service` | `30` | How long an unpaid order can still be paid. Payments are simulated and need no keys — see [PAYMENTS.md](../PAYMENTS.md). |

**Restaurant accounts:** there is no restaurant-staff login yet — only
`USER`/`ADMIN` exist. The restaurant accept/reject/preparing/ready endpoints
(`restaurant-service`, `/api/restaurants/{restaurantId}/orders/{orderId}/...`)
and the order status override (`PUT /api/orders/{id}/status`, used to mark an
order out for delivery / delivered) are ADMIN-only for now, standing in for a
real operator console until dedicated roles are built.

**Removed services:** `payment-service`, `delivery-service` and
`notification-service` (and their `PAYMENT_*` / `DELIVERY_*` /
`NOTIFICATION_*` variables) no longer exist. See
[REMOVED_SERVICES.md](../REMOVED_SERVICES.md). Payments are back, but inside
`order-service` and simulated (see [PAYMENTS.md](../PAYMENTS.md)); `PAYMENT_PROVIDER`
and `RAZORPAY_*` are not read by anything.

## Kafka

`order-service` connects to Kafka at `KAFKA_BOOTSTRAP_SERVERS` (default
`localhost:9092`). Start the local broker first:

```bash
cd foodVilla_backend
docker compose up -d kafka
# optional web UI at http://localhost:8090
docker compose up -d kafka-ui
```

**Connection security** (`order-service`). Local Docker Kafka is PLAINTEXT and
needs nothing beyond `KAFKA_BOOTSTRAP_SERVERS`. For a SASL_SSL cluster (e.g.
Aiven on Render) set these environment variables. The defaults are the local
ones; nothing Aiven-specific is stored in the repo, and credentials must only
ever be supplied as deployment secrets, never committed:

| Variable | Default | Example (Aiven / Render) |
|---|---|---|
| `KAFKA_BOOTSTRAP_SERVERS` | `localhost:9092` | the cluster's **SASL** host:port |
| `KAFKA_SECURITY_PROTOCOL` | `PLAINTEXT` | `SASL_SSL` |
| `KAFKA_SASL_MECHANISM` | *(empty)* | `SCRAM-SHA-256` |
| `KAFKA_SASL_JAAS_CONFIG` | *(empty)* | `org.apache.kafka.common.security.scram.ScramLoginModule required username="…" password="…";` |
| `KAFKA_SSL_CA_CERTIFICATE` | *(empty)* | `file:/etc/secrets/aiven-kafka-ca.pem` (a Render Secret File), or the PEM text itself |

Aiven's broker certificate is signed by the project's own CA, which the JVM does
not trust by default (`PKIX path building failed … unable to find valid
certification path`). Download `ca.pem` from the Aiven console (Kafka service →
Overview → CA certificate) and supply it through `KAFKA_SSL_CA_CERTIFICATE`,
either as a Render Secret File path or by pasting the PEM (real line breaks,
including the `BEGIN`/`END` lines). Certificate verification stays on; the CA is
trusted by the Kafka clients only, not JVM-wide. Nothing needs committing or
importing in the Dockerfile. If the path is wrong, the service still starts and
the Kafka clients log repeated `Error connecting to node` warnings naming the
file they could not read.

A Kafka client defaults to PLAINTEXT. Pointing it at a TLS/SASL_SSL-only port
without setting these makes the broker answer with a TLS alert that the client
misreads as a ~336 MiB response length, failing with `OutOfMemoryError` in
`NetworkReceive.readFrom` regardless of the fetch-size limits.

Topics (`foodvilla.restaurant.events`, which `restaurant-service` publishes
and `order-service` consumes, and `foodvilla.order.events`, which
`order-service` publishes and nothing in this repo currently consumes) are
auto-created on first publish/subscribe against the local broker — no
manual provisioning needed for development. Each is overridable
(`KAFKA_TOPIC_RESTAURANT_EVENTS`, `KAFKA_TOPIC_ORDER_EVENTS`) if you need non-default names. A
production cluster (e.g. MSK) may have auto-create disabled — provision
these topics explicitly before deploying there.

If Kafka isn't running, `order-service` will retry connecting in the
background per Spring Kafka's defaults rather than failing to start — REST
endpoints keep working, only event publish/consume is affected.

**Important — same variable name, different shape:** `RESTAURANT_SERVICE_URL` and `CATALOGUE_SERVICE_URL` each mean two different things depending on which service reads them: the *inter-service REST client* usages (`foodcatalogue-service`, `order-service`) expect the **full path including the trailing `/api/...` segment**, while the *gateway routing* usage expects the **bare origin** (no path — the gateway appends the incoming request path itself). This is safe when each service reads its own process environment (e.g. separate containers in Docker/AWS), but if you're running all services from one shared local shell, only override these if you're certain which services are picking up the value — otherwise rely on the per-service defaults above, which are already consistent with each other.

## Supplying them locally

Export them in your shell before running a service, for example:

```bash
export DB_PASSWORD='your-local-mysql-password'
export JWT_SECRET='replace-with-your-own-long-random-string'

cd foodVilla_backend/user-service
./mvnw spring-boot:run
```

Alternatively, set them as environment variables in your IDE's run
configuration for each service (IntelliJ: Run Configuration → Environment
variables), or in a local, **untracked** file such as `.env` that you
`source` yourself before running Maven — this repository's `.gitignore`
already excludes `.env` and `.env.*`, so nothing there can be committed.

Do not put real values in any tracked `application.yml`, `.properties`, or
source file.
