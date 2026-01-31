import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.quarterlog.app',
  appName: 'Winner Effect',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_status_bar_logo",
      iconColor: "#488AFF",
      sound: "beep.wav",
    },
  },
};

export default config;