// See .env.example for what value to use here depending on where the app
// is running (emulator vs physical device vs production) — Expo inlines
// EXPO_PUBLIC_ variables at build time, must be referenced via dot notation.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:8080";
