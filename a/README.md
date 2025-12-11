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
5. Start the backend before running the client so Stripe and Dialogflow calls succeed. From `a/server`, run `npm start` (listens on port 3000 by default), expose it with `ngrok http 3000` (or similar), and point the app at that public URL when testing payments and AI flows.

## Running the project
- **Backend** (from `a/server`):
  ```bash
  npm start
  ```
  Runs the Express server on port 3000. Endpoints include `/create-payment-intent`, `/payment-sheet`, `/create-setup-intent`, `/list-payment-methods`, `/attach-payment-method`, `/detach-payment-method`, `/refund`, `/send-verification`, `/verify-code`, and `/dialogflow/fulfillment`. Start this first (plus an `ngrok http 3000` tunnel) so the client can reach payments and AI endpoints.
- **Expo app** (from `a`):
  ```bash
  npm start
  ```
  Use the QR code/`w`, `a`, `i` shortcuts from the Expo CLI to launch on device, web, or simulators.

## Deployment (App Store and Google Play)
If you need to ship the mobile app to real users, here’s the shortest path without deep DevOps work. You will need an Expo account.

1. **Prepare store accounts**
   - Apple: Enroll in the Apple Developer Program and make sure you have access to App Store Connect.
   - Google: Sign in to the Google Play Console with a developer account.
2. **Log into Expo and configure app metadata**
   - From `a/`, run `npx expo login` and sign in.
   - Update `app.json` with the correct app name, slug, icons, splash, and bundle identifiers (iOS `ios.bundleIdentifier`, Android `android.package`).
   - Ensure `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) match the Firebase project you want to ship.
3. **Create production builds**
   - iOS: `cd a && npx expo build:ios` (Expo will guide you through certificates; choose the “Let Expo handle it” option if you’re unsure.)
   - Android: `cd a && npx expo build:android` (pick the **APK** for easy upload or **AAB** if required by Play Store; Expo can also manage the keystore for you.)
   - Wait for the build links that Expo prints; download the resulting `.ipa` (iOS) and `.apk`/`.aab` (Android).
4. **Test the build artifacts**
   - Install the Android APK on a device (enable “install from unknown sources”).
   - For iOS, use TestFlight: upload the `.ipa` in App Store Connect > TestFlight and invite testers.
5. **Submit to the stores**
   - **Apple App Store:** In App Store Connect, create a new app record that uses the same bundle identifier and version as `app.json`. Upload the `.ipa` (via Transporter or the web form), fill out required screenshots/descriptions, and submit for review.
   - **Google Play:** In the Play Console, create a production release, upload the `.apk`/`.aab`, fill in store listing details, content rating, and privacy details, then roll out the release.
6. **Keep environment settings updated**
   - Make sure any backend URLs (including your `ngrok` or production domain) are set to stable, publicly reachable addresses before submitting.
   - Rotate credentials (Stripe keys, Firebase config) to production values as needed and confirm payments/Dialogflow still work against your deployed backend.

## Notes for the next developer
- Stripe publishable key is set in `App.tsx` for the dedicated checkout screen, and Stripe customer/payment flows in `app/(tabs)/home.tsx` rely on the backend endpoints above.
- Firestore reads/writes for bookings, shuttle locations, and user profiles live in `app/(tabs)/home.tsx`, `app/services/bookings.js`, and `app/services/shuttleLocation.ts`.
- Dialogflow webhook requests go to `/dialogflow/fulfillment` in the backend; it currently creates Firestore `booking` documents from caller intents.
- If you change Firebase projects, update `firebaseConfig.js` and the native `GoogleService-Info.plist`/`google-services.json` files accordingly.
