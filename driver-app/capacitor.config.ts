import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.transportpro.driver',
  appName: 'TransportPro Driver',
  webDir: 'dist',
  server: {
    // Permet la connexion HTTP en développement
    cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    Camera: {
      permissions: ['camera']
    }
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
