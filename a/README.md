# Peoplestown Shuttle – developer quickstart

A concise orientation for working on the Peoplestown Shuttle Expo app and its small Node/Express backend. This app uses Firebase (client SDK + admin SDK) for auth/data and Stripe for payments.

## Repository layout
- `app/`: Expo Router screens (tabs, modals, profile views) and Firestore/Stripe integration.
- `components/`, `constants/`, `hooks/`, `context/`: Shared UI pieces, styling tokens, custom hooks, and React context providers.
- `server/`: Node/Express service that issues Stripe intents, manages payment methods, sends verification emails, and handles Dialogflow webhook calls.
- Firebase configuration is in `firebaseConfig.js`; native config files (`GoogleService-Info.plist`, `google-services.json`) are checked in for the current project.

## Prerequisites
- Node.js 18+ and npm.
- Expo tooling (`npm install -g expo-cli` is optional; `npx expo` works fine).
- Android Studio/iOS Simulator or a device with Expo Go for running the client.
- Stripe test keys and a Gmail app password (for verification emails) for the backend.

## Setup
1. Install client dependencies from the repo root of the app:
   ```bash
   cd a
   npm install
   ```
2. Install backend dependencies:
   ```bash
   cd server
   npm install
   ```
3. Environment for the backend (`a/server/.env`):
   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   EMAIL_USER=your_gmail_username
   EMAIL_PASS=your_app_password
   APP_DOMAIN=https://your-public-app-url.example.com  # used in returned payment sheet URLs
   ```
   The backend reads `serviceAccountKey.json` for Firebase admin access—replace it with credentials for your Firebase project if needed.
4. Point the app at your backend for payments. In `app/(tabs)/home.tsx`, update the `fetch` call to `/create-payment-intent` to use your server URL (the sample code currently points to an ngrok tunnel).

## Running the project
- **Backend** (from `a/server`):
  ```bash
  npm start
  ```
  Runs the Express server on port 3000. Endpoints include `/create-payment-intent`, `/payment-sheet`, `/create-setup-intent`, `/list-payment-methods`, `/attach-payment-method`, `/detach-payment-method`, `/refund`, `/send-verification`, `/verify-code`, and `/dialogflow/fulfillment`.
- **Expo app** (from `a`):
  ```bash
  npm start
  ```
  Use the QR code/`w`, `a`, `i` shortcuts from the Expo CLI to launch on device, web, or simulators.

## Notes for the next developer
- Stripe publishable key is set in `App.tsx` for the dedicated checkout screen, and Stripe customer/payment flows in `app/(tabs)/home.tsx` rely on the backend endpoints above.
- Firestore reads/writes for bookings, shuttle locations, and user profiles live in `app/(tabs)/home.tsx`, `app/services/bookings.js`, and `app/services/shuttleLocation.ts`.
- Dialogflow webhook requests go to `/dialogflow/fulfillment` in the backend; it currently creates Firestore `booking` documents from caller intents.
- If you change Firebase projects, update `firebaseConfig.js` and the native `GoogleService-Info.plist`/`google-services.json` files accordingly.
