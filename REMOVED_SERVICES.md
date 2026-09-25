# Removed components

Four components were removed from FoodVilla to leave the core web application:

| Removed | What it was |
|---|---|
| `payment-service` (:8085) | Mock/Razorpay payments, published `foodvilla.payment.events` |
| `delivery-service` (:8086) | Delivery partners + assignments, published `foodvilla.delivery.events` |
| `notification-service` (:8087) | In-app notifications + SSE push, consumed `foodvilla.order.events` |
| `foodvilla-mobile` | React Native (Expo) customer app |

Everything else — `eureka_server`, `api-gateway`, `user-service`,
`restaurant-service`, `foodcatalogue-service`, `order-service`, the React web
app, MySQL and Kafka — is unchanged in purpose.

The removed source is still in git history, e.g.
`git show 6ae3b56:foodVilla_backend/payment-service/pom.xml`, or restore a whole
folder with `git checkout 6ae3b56 -- foodVilla_backend/payment-service`.

> **Update:** online payment has since come back, but inside `order-service` and
> **simulated** (dummy details, no gateway, no real money), not as a separate service —
> see [PAYMENTS.md](PAYMENTS.md). The "Placing an order … moves it to
> `RESTAURANT_PENDING` in the same request" behaviour described below is therefore
> superseded: an order now stays `CREATED` until it is paid. `payment-service`, `delivery-service`, `notification-service`
> and the mobile app remain removed.

## How the order flow changed

Payment events used to move an order from `CREATED` to `RESTAURANT_PENDING`,
and delivery events moved it from `READY_FOR_PICKUP` to `DELIVERED`. Without
those services an order would have stalled at `CREATED` and again at
`READY_FOR_PICKUP`, so `order-service` now does the smallest equivalent:

- **Placing an order** creates it and moves it to `RESTAURANT_PENDING` in the
  same request (history records both `CREATED` and `RESTAURANT_PENDING`; one
  `foodvilla.order.events` event is published). No payment is collected or
  simulated.
- **Finishing an order:** an ADMIN moves a `READY_FOR_PICKUP` order to
  `OUT_FOR_DELIVERY`, then `DELIVERED`, from the admin order page (or
  `PUT /api/orders/{id}/status`). There is no delivery-partner assignment.

State machine (`OrderStatusTransitionValidator`): two edges were added
(`CREATED → RESTAURANT_PENDING`, `READY_FOR_PICKUP → OUT_FOR_DELIVERY`) and the
edges *into* the payment / delivery-partner states were removed, so nothing can
newly enter them.

## Kept on purpose (legacy, for existing data)

These look like leftovers but are needed so databases that already contain
orders keep working:

- `OrderStatus` still has `PAYMENT_PENDING`, `PAYMENT_CONFIRMED`,
  `PAYMENT_FAILED`, `DELIVERY_PARTNER_ASSIGNED`, `PICKED_UP`. The column is
  stored as a string, so deleting an enum value makes any old order with that
  status fail to load. Their *outgoing* transitions remain, so such an order can
  still be moved forward or cancelled by an admin.
- `Order.paymentStatus` / `paymentId` / `deliveryPartnerId` and the
  `PaymentStatus` enum. `payment_status` is `NOT NULL` in existing databases, so
  removing the field would make every insert fail there. New orders just keep
  `payment_status = PENDING` and null ids; the web UI no longer displays them.
- The `deliveryFee` on an order is order-service's own customer charge
  (`ORDER_DELIVERY_FEE`), unrelated to the removed service.

## Obsolete database objects — NOT dropped

Nothing was dropped or altered in any existing database. These now belong to
no service; drop them yourself only when you are sure you don't need the data.

| Schema | Tables |
|---|---|
| `foodvilla_paymentService` | `payments` |
| `foodvilla_deliveryService` | `delivery_partners`, `delivery_assignments` |
| `foodvilla_notificationService` | `notifications`, `device_tokens` |

`docker-compose.yml`'s `db-init/01-create-databases.sql` no longer creates these
schemas, but it only runs on a brand-new MySQL volume, so an existing local
volume keeps them. Optional manual cleanup (nothing in this repo runs it):

```sql
DROP DATABASE foodvilla_paymentService;
DROP DATABASE foodvilla_deliveryService;
DROP DATABASE foodvilla_notificationService;
```

The deployed Aiven MySQL was only ever given the four core schemas
(`DEPLOYMENT.md`), so there is likely nothing to clean up there.

In `foodvilla_orderService.orders`, the columns `payment_id`, `payment_status`
and `delivery_partner_id` are still mapped by the entity — leave them.

## Kafka

Kafka is **still required**: `restaurant-service` publishes
`foodvilla.restaurant.events` and `order-service` consumes them (accept /
reject / preparing / ready).

- `foodvilla.payment.events` and `foodvilla.delivery.events` now have no
  producer or consumer. Delete them from the broker if they exist (Kafka UI or
  your provider's console); `order-service` no longer subscribes to them.
- `foodvilla.order.events` is still published by `order-service` on every status
  change but nothing consumes it. Its old consumer group, `notification-service`,
  stays on the broker with its committed offsets until deleted; harmless.
- If you later decide to drop Kafka entirely, `order-service`'s
  `RestaurantEventConsumer` and `restaurant-service`'s
  `RestaurantEventPublisher` would need replacing with a direct call first —
  that is a separate decision and was not made here.

## Local configuration that is now unused

Delete these from your untracked root `.env` if present (Compose ignores them,
so leaving them is harmless): `PAYMENT_PROVIDER`, `RAZORPAY_KEY_ID`,
`RAZORPAY_KEY_SECRET` (payments no longer use Razorpay at all). On Render, delete `PAYMENT_SERVICE_URL`,
`DELIVERY_SERVICE_URL` and `NOTIFICATION_SERVICE_URL` from `api-gateway` if you
had set them.
