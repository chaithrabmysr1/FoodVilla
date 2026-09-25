# Payments — Razorpay TEST MODE

> **This is a portfolio/demo payment integration. It runs Razorpay in TEST
> MODE only and never processes real money.** The backend refuses any key that
> does not start with `rzp_test_`, so a live key pasted into the environment by
> mistake simply disables payments instead of charging anyone.

Payments live inside **order-service** — there is no separate payment-service
(the old one was removed; see [REMOVED_SERVICES.md](REMOVED_SERVICES.md)).

## The customer flow

1. Log in, browse restaurants, add food to the cart.
2. **Checkout** shows the delivery address, the items (names and quantities) and
   the real bill — item total, delivery fee, taxes, discount, **To pay** —
   priced by the backend (`POST /api/orders/quote`), not by the browser.
3. **Proceed to Payment** opens the **Choose Payment Method** page: the amount to
   pay, an order summary, and method cards. Nothing is created and no payment window
   opens yet.
   - **Razorpay**, **UPI** and **Credit / Debit Card** are real: each opens Razorpay's
     own Checkout in test mode (UPI and Card limit it to that method through
     Razorpay's `config.display`; Razorpay shows everything). Card / UPI details are
     entered inside Razorpay's checkout — FoodVilla never renders a card form.
   - **Net Banking**, **Paytm** and **PayPal** are shown disabled as *Coming soon*:
     placeholders with no handler, no API call and no fake success.
4. **Pressing Pay ₹…** creates the order (`CREATED`, payment `PENDING` — not
   confirmed, not visible to the restaurant), asks the backend for a Razorpay order,
   and opens Razorpay Checkout in test mode. A loading state covers the page while the
   payment is prepared, in progress and being verified.
5. The customer pays with Razorpay's test credentials (below).
6. Razorpay hands the browser a payment id and a signature. The browser sends
   them to `POST /api/orders/{id}/payment/verify`.
7. The **backend** verifies the signature with the Razorpay secret. Only then is
   the payment recorded and the order confirmed and handed to the restaurant.
8. The confirmation shows **✓ Payment Successful** and **✓ Order Confirmed** with
   Order ID, Razorpay payment ID, Amount paid, Payment status (PAID), restaurant,
   order summary, and **View My Orders** / **Continue Shopping**. Until step 7
   succeeds nothing says "successful", and the cart is not cleared. (There is no
   estimated-delivery field in the order model, so none is shown.)
9. If the customer cancels or the payment fails, no order is confirmed: the unpaid
   order and the cart are kept, and choosing Razorpay again retries the same order.
10. **My Orders** shows each order's payment status, method and payment id.

## Order state vs payment state

They are separate.

| | Values |
|---|---|
| Payment (`paymentStatus`) | `PENDING` → `CONFIRMED` (paid) **or** `FAILED`; `FAILED` → `PENDING` on retry |
| Order (`orderStatus`) | `CREATED` → `RESTAURANT_PENDING` → `RESTAURANT_ACCEPTED` → `PREPARING` → `READY_FOR_PICKUP` → `OUT_FOR_DELIVERY` → `DELIVERED`; `CANCELLED` on the side |

**Decision — when does an order become valid for the restaurant?** Only when its
payment has been verified server-side. A new order stays `CREATED`: the restaurant
workflow cannot accept, prepare or ready it (those transitions all start from
`RESTAURANT_PENDING` or later), although it does appear in the admin order list as
`CREATED`. The verified payment moves it `CREATED → RESTAURANT_PENDING` in the same
database transaction that records the payment. A failed, abandoned or expired payment
therefore never reaches a restaurant queue.

**Why the paid value is called `CONFIRMED`, not `PAID`.** `orders.payment_status`
is a native MySQL `enum('CONFIRMED','FAILED','PENDING')` in every existing
database, and Hibernate's `ddl-auto: update` does not change the type of an existing column. A
new `PAID` value would be rejected by MySQL at the exact moment a payment is
recorded. So the existing value is reused; the UI shows it as "Paid". Renaming it
needs a real schema migration (Flyway/Liquibase), which this feature deliberately
does not introduce.

The old `PAYMENT_PENDING` / `PAYMENT_CONFIRMED` / `PAYMENT_FAILED` *order*
statuses are not used by the new flow. They stay in the enum only so old rows load.

## Why order-service and not a separate payment-service

- The payment result and the order state must change **atomically** (paid ⇒
  `RESTAURANT_PENDING`). Inside order-service that is one row-locked transaction.
  A separate service would need a cross-service call or Kafka event, i.e. a
  dual-write that can leave "paid but never sent to the restaurant" behind.
- Confirming a payment would then depend on Kafka being reachable. In this
  deployment Kafka is optional; card payments should not be.
- It avoids a sixth Render service, a second database and more cold starts on the
  free tier.
- Cost: less of a "microservices showcase", and payment code shares order-service's
  deploy. It is isolated behind a `RazorpayGateway` interface (package
  `order_service.payment`) so it can be extracted later.

## API

All routes require a valid JWT and are reached through the API gateway
(`/api/orders/**`). Payment routes are allowed for the **order's owner or an
ADMIN**; anyone else gets `403`.

| Method & path | Purpose |
|---|---|
| `POST /api/orders/quote` | Price a cart without creating anything. Body `{restaurantId, items:[{foodItemId, quantity}]}`. |
| `GET /api/orders/payment/config` | `{available, mode:"TEST", message}` — is paying possible? |
| `POST /api/orders/{orderId}/payment/create` | Start (or resume) a payment. Optional body `{amount}` (rupees, advisory). Returns `{orderId, razorpayOrderId, amount, currency, keyId}` — `amount` is in **paise**, `keyId` is the public key id. |
| `POST /api/orders/{orderId}/payment/verify` | Body `{razorpayOrderId, razorpayPaymentId, razorpaySignature}`. Verifies the signature, records the payment, returns the order. |
| `POST /api/orders/{orderId}/payment/failure` | Records a failed attempt reported by Razorpay Checkout. Can never mark an order paid or undo a paid one. |
| `POST /api/orders/{orderId}/payment/sync` | Asks Razorpay directly whether the order was paid and applies it if so (recovery after a refresh / dropped connection). |

Errors carry a stable `code` next to the message: `PAYMENT_NOT_CONFIGURED` (503),
`PAYMENT_PROVIDER_ERROR` (502), `ORDER_ALREADY_PAID` (409), `ORDER_NOT_PAYABLE`
(409), `ORDER_EXPIRED` (410), `AMOUNT_MISMATCH` (409), `PAYMENT_NOT_STARTED`
(409), `PAYMENT_ORDER_MISMATCH` (400), `INVALID_SIGNATURE` (400).

## Security model

- **The secret never leaves the backend.** `RAZORPAY_KEY_SECRET` is read only by
  order-service and passed only to the Razorpay SDK. The browser receives the
  public `keyId` from the `create` response — no `VITE_*` variable is needed.
  It is not logged, not returned, not baked into any image.
- **The amount is never taken from the browser.** The charge is the order's stored
  total. A client `amount` is only compared and refused (`409`) if it differs.
- **Only a verified signature marks an order paid** (HMAC-SHA256 of
  `razorpayOrderId|razorpayPaymentId`, checked with the SDK). Navigation state and
  what Razorpay Checkout reports in the browser are never trusted.
- **A payment is tied to its order.** A verify request must quote the Razorpay order
  created for *that* order, or it is rejected.
- **Idempotent.** State changes run under a row lock. Repeating a successful verify
  returns the current order (no second history entry, no second event); a *different*
  payment id on a paid order is refused.
- **Test keys only.** A key not starting with `rzp_test_` disables payments.
- **Missing config is not fatal.** Without keys the app starts and everything except
  paying works; payment endpoints answer `503 PAYMENT_NOT_CONFIGURED` and the checkout
  page says so.
- **Admin override.** An ADMIN can pay on a customer's behalf, and the admin "Force
  status" action can move an unpaid `CREATED` order to `RESTAURANT_PENDING` with
  payment still `PENDING`. That is an operator tool, not a customer path.

## Database changes

Additive and nullable only — safe for `ddl-auto: update` on a table that already has
orders. Nothing is dropped or renamed; existing orders load unchanged.

`orders` gains: `razorpay_order_id`, `payment_provider`, `paid_at`,
`payment_failure_reason`. Existing `payment_id` (Razorpay `pay_…`) and
`payment_status` are reused.

Orders placed while there was no payment step sit in `RESTAURANT_PENDING` (or later)
with `payment_status = PENDING`; they are shown as "No online payment" and cannot be
paid. Orders left `CREATED` and unpaid past the deadline show "Payment expired".

## Configuration

| Variable | Where | Required | Meaning |
|---|---|---|---|
| `RAZORPAY_KEY_ID` | order-service | for payments | Razorpay **test** key id, `rzp_test_…`. Public. |
| `RAZORPAY_KEY_SECRET` | order-service | for payments | Razorpay test key secret. **Secret** — backend only. |
| `PAYMENT_PENDING_ORDER_TTL_MINUTES` | order-service | no (default `30`) | How long an unpaid order can still start a payment. |

Only placeholder names are committed (`.env.example`); real values go in the untracked
root `.env` locally and in Render's environment in deployment.

## Test it locally

1. In the Razorpay Dashboard switch to **Test Mode**, then *Account & Settings → API
   Keys → Generate Test Key*. Copy the Key Id (`rzp_test_…`) and Key Secret.
2. Put them in the repo-root `.env` (untracked):
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
   ```
3. Rebuild and restart the two things that changed:
   `docker compose up -d --build order-service web`
4. Open http://localhost:5173, log in, add food to the cart, **Checkout**. The bill
   should show item total, delivery fee, taxes, discount and *To pay*.
5. Click **Proceed to Payment**. In Razorpay Checkout use a test method — Razorpay's
   documented test card `4111 1111 1111 1111` with any future expiry and any CVV, or
   test UPI `success@razorpay` (`failure@razorpay` to see a failure). Razorpay may
   change these; see its "Test Card Details" docs.
6. You should land on **Payment successful** (Order ID, Amount paid, Payment ID,
   Order status). **My Orders** shows *Paid · Razorpay (Test Mode)*. In the Razorpay
   Dashboard (Test Mode → Transactions) the payment should appear.
7. Also try: closing the modal (order stays *Awaiting payment*, cart intact, *Retry
   Payment* works), a failing test payment, and refreshing while Checkout is open.

If step 5 says payment "isn't available", the keys did not reach order-service:
`docker compose logs order-service | grep -i razorpay` prints either
`payments enabled in TEST MODE` or the reason it is disabled.

## Deploy: Vercel + Render

- **Render → order-service:** add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` as
  environment variables (mark the secret as a secret). Nothing else changes; the
  gateway already routes `/api/orders/**`.
- **Vercel:** **no Razorpay variable is needed.** The public key id comes from the
  backend at payment time. Never add the secret to Vercel or to any `VITE_*` variable.
- **First start on an existing database:** `ddl-auto: update` adds the four nullable
  columns to `orders`. No data migration.
- Razorpay Checkout loads from `https://checkout.razorpay.com` in the browser; nothing
  in the frontend build or the nginx/Vercel config needs to allow it explicitly (no CSP
  is set).

## Tests

```bash
cd foodVilla_backend/order-service
mvn test
```

- `PaymentServiceTest` — the payment rules with Razorpay stubbed: amount from the
  order, ownership, valid/invalid signature, idempotent verify, already-paid,
  cancelled/expired/legacy orders, failure and retry, refresh recovery, not-configured.
- `RazorpaySdkGatewayTest` — the real SDK's signature check against an independently
  computed HMAC, and the test-key-only guard.
- `PaymentApiIntegrationTest`, `PaymentsNotConfiguredIntegrationTest` — over HTTP with
  real Spring Security, JPA and row locking on in-memory H2; no MySQL, Kafka or network.

`OrderServiceApplicationTests.contextLoads` needs a live, correctly-credentialed MySQL
and fails without one; that is unchanged from before this feature.

## Known limitations

- **UPI / Card "limited to that method" is unverified against real Razorpay.** It relies
  on Razorpay's `config.display` option. If Razorpay ignores it, those two cards simply
  open the full Razorpay Checkout; the unrestricted **Razorpay** card is unaffected.

- **Not verified against real Razorpay test keys in the development environment** (none
  were available). What *was* checked: the SDK reaches Razorpay under this project's
  HTTP stack and is rejected cleanly with fake credentials; signature verification
  matches an independent HMAC; everything else runs against stubs. Do the steps above
  once with your own test keys before demoing.
- **No refunds.** Cancelling a paid order does not refund it. In test mode no money moved.
- **No Razorpay webhooks.** Recovery from a lost browser uses `payment/sync`, which needs
  the customer to return to the app. Webhooks would confirm payments even if they never do.
- **Abandoned unpaid orders are not auto-cancelled;** they expire (cannot be paid) and
  stay visible as *Payment expired* until cancelled.
- **Kafka publishing can still slow a request.** Order events are published inside the
  request; with an unreachable broker a publish can block for up to ~60 s (pre-existing).
  Payment verification publishes *after* the payment is committed and tolerates failure,
  but still waits for the send.
- Timestamps such as `createdAt`/`paidAt` are server-local `LocalDateTime`s; the UI does
  not show `paidAt` because the existing time display is off by the viewer's UTC offset.
