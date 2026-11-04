import type { CapacitorConfig } from '@capacitor/cli';

// Android aplikacija (APK) pakuje isti build kao web verzija (dist/); radi i bez interneta.
const config: CapacitorConfig = {
  appId: 'ba.pogonboskrupa.aisumar',
  appName: 'Forester',
  webDir: 'dist',
  android: {
    backgroundColor: '#f6f5f1',
    // Lokalni AI model (npr. llama.cpp/Ollama na telefonu) je običan http://localhost server.
    allowMixedContent: true,
  },
  server: {
    cleartext: true,
  },
};

export default config;
