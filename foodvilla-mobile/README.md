# FoodVilla Mobile

React Native (Expo, TypeScript) customer app for FoodVilla. Uses the **same
backend APIs** as the web app (`foodVilla_frontend/`) via the API Gateway —
no separate mobile business logic or duplicate endpoints.

## Stack

- Expo SDK 57 (React Native 0.86, React 19), TypeScript
- React Navigation (native-stack + bottom-tabs) — gates the whole app behind
  login on mobile (unlike the web app, which allows anonymous browsing)
- Redux Toolkit — auth, cart, selected checkout address, notifications
- Axios, with the JWT attached via a request interceptor
- `expo-secure-store` for the JWT (encrypted keychain/keystore), plain
  `AsyncStorage` for the cart and cached profile (non-sensitive)
- `expo-notifications` — device registration only; see **Push notifications**

## Setup

```bash
cd foodvilla-mobile
npm install
cp .env.example .env   # then edit EXPO_PUBLIC_API_BASE_URL — see Networking below
npx expo start
```

Requires the backend running (`foodVilla_backend/`) — at minimum
`api-gateway`, `user-service`, `restaurant-service`, `foodcatalogue-service`,
`order-service`, `payment-service`, `delivery-service`, `notification-service`.
See `foodVilla_backend/CONFIGURATION.md`.

## Networking — which `EXPO_PUBLIC_API_BASE_URL` to use

This trips people up constantly, so it's worth being explicit. The value
depends on **where the app process is actually running**, not where the
backend is running (the backend is always on your development machine):

| Running on | Use | Why |
|---|---|---|
| Web preview (`expo start --web`) | `http://localhost:8080` | Runs in a browser on the same machine as the backend. |
| iOS Simulator | `http://localhost:8080` | The simulator shares the host Mac's network namespace. |
| Android Emulator | `http://10.0.2.2:8080` | The emulator is its own virtual machine — `localhost` inside it refers to the emulator, not your Mac. `10.0.2.2` is the special alias Android's emulator provides for the host machine's `localhost`. |
| Physical device (Expo Go, same Wi-Fi) | `http://<your-machine-LAN-IP>:8080` | The device is a separate machine on your network; find your LAN IP with `ipconfig getifaddr en0` (macOS Wi-Fi) and make sure the backend's `CORS_ALLOWED_ORIGIN`/firewall allow it. |
| Production | Your deployed API Gateway URL (e.g. an AWS ALB/API Gateway domain) | Set via EAS build profile env vars, never hardcoded. |

Change `.env` and restart `expo start` (Expo inlines `EXPO_PUBLIC_*` vars at
bundle time — edits require a restart, not just a reload).

## Push notifications — current status

`registerForPushNotifications()` (`src/utils/pushNotifications.ts`) requests
permission and registers the device's Expo push token with
`notification-service` via `POST /api/notifications/devices` — but:

1. It needs a real EAS `projectId` in `app.json` (`extra.eas.projectId`),
   which this repo doesn't have configured. Run `eas init` and it'll fill
   itself in; until then, registration is a no-op (logged, not crashed).
2. **notification-service only stores the token — no push provider
   (Expo Push API / FCM / APNs) is wired up on the backend to actually send
   anything yet.** This is a backend config gap, not a mobile-side one; see
   `foodVilla_backend/CONFIGURATION.md`.
3. Push tokens don't exist on simulators/emulators (`Device.isDevice` guards
   this) — only real hardware.

Until (1) and (2) are done, in-app notifications (`NotificationsScreen`,
polling `GET /api/notifications`) are the real, working notification
channel on mobile.

## Real-time order status

notification-service exposes a live SSE stream (`GET
/api/notifications/stream`) that the **web** app subscribes to via the
browser's native `EventSource`. React Native has no built-in `EventSource`,
and adding an unverified native polyfill wasn't worth the risk without a
device to test it against — so mobile polls instead
(`OrderTrackingScreen`/`NotificationsScreen`, every 8–15s while the relevant
screen is focused and the order is non-terminal). This is the
explicitly-sanctioned fallback, not a workaround nobody signed off on.

## What's genuinely new on the backend for mobile

Almost nothing — mobile reuses every existing endpoint. The one addition:
`GET /api/delivery/partners/{id}/public` (delivery-service) — a minimal,
non-admin-gated endpoint returning just `{id, name, phone, vehicleType}` so
order tracking can show "delivered by X" without requiring the ADMIN role
every other delivery-service endpoint needs. See
`foodVilla_backend/CONFIGURATION.md`.

## Known limitations

- No physical device or emulator was available to actually launch the app
  in this build — verified via `tsc --noEmit`, `expo lint`, `expo-doctor`,
  and a full `expo export` bundle (982 modules resolve cleanly), but not by
  clicking through the UI. Do that before considering this done.
- Razorpay isn't wired into the mobile checkout UI — only the mock payment
  flow (matches the backend's default `PAYMENT_PROVIDER=mock`). The backend
  Razorpay integration itself is real but also untested against live
  credentials — see the backend memory notes / `CONFIGURATION.md`.
- No saved multi-address book (backend doesn't have one yet either — see
  Phase 1's documented decision to defer it).
