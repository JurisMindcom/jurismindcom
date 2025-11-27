import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.d1e27fd242b1450095e70ee8e269eaa7',
  appName: 'JurisMind',
  webDir: 'dist',
  server: {
    url: 'https://d1e27fd2-42b1-4500-95e7-0ee8e269eaa7.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0F0F14',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
