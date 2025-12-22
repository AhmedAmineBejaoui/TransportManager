# Mobile build (Capacitor + Android)

This repo now includes a Capacitor config to package the web app as a mobile app.

## Prerequisites
- Android Studio + Android SDK/NDK, Java 17
- Node.js + npm
- (Optional) Set `CAP_SERVER_URL` to your API base, e.g. `http://192.168.1.13:5000`

## Build steps
1) Install deps: `npm install`
2) Build the web app: `npm run build` (outputs to `dist/public`)
3) Sync to Android: `npm run cap:sync`
4) Open Android Studio: `npm run cap:open:android`
5) In Android Studio: Build > Build Bundle(s)/APK(s) > Build APK(s)
6) APK location: `android/app/build/outputs/apk/debug/app-debug.apk` (or release after signing)

## Server URL
- `capacitor.config.ts` defaults to `http://192.168.1.13:5000`. Override with env var:  
  `CAP_SERVER_URL=https://api.example.com npm run cap:sync`
- For production, set a valid HTTPS API host; update CORS `ALLOWED_ORIGINS` to include the mobile origin if needed.
