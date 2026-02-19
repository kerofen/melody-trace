import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.kerofen.melodytrace',
    appName: 'Melody Trace',
    webDir: 'dist',
    plugins: {
        StatusBar: {
            overlaysWebView: true,
            style: 'Dark',
        },
        SplashScreen: {
            launchShowDuration: 2000,
            backgroundColor: '#1a1a2e',
            showSpinner: false,
        },
    },
};

export default config;
