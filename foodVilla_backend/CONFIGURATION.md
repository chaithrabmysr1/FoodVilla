# Backend local configuration

This project reads secrets from environment variables rather than from
tracked `application.yml` files. No default value is committed for any of
them, so each service will fail fast at startup with a clear error if the
required variable is missing — this is intentional.

## Required environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `DB_PASSWORD` | `user-service`, `restaurant-service`, `foodcatalogue-service` | MySQL password for the local `root` user (all three services connect to the same local MySQL instance, in separate schemas). |
| `JWT_SECRET` | `user-service` | HMAC-SHA256 signing key for issuing/validating JWTs. Use a long, random string (32+ characters) — never reuse an example or previously-committed value. |

`eureka_server` does not require any secret.

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
