import { CapacitorConfig } from "@capacitor/cli";

const serverUrl =
  process.env.CAP_SERVER_URL ||
  // Default to LAN backend; adjust to your server host/IP as needed
  "http://192.168.1.13:5000";

const config: CapacitorConfig = {
  appId: "com.transportpro.app",
  appName: "TransportManager",
  webDir: "dist/public",
  bundledWebRuntime: false,
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
