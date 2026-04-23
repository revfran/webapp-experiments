import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.revfran.webviewapp',
  appName: 'webexp',
  webDir: 'www',
  server: {
    allowNavigation: ['*'],
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
