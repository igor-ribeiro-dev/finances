import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const required = ['VITE_API_URL'];
  const missing = required.filter((key) => !env[key]);
  if (missing.length > 0) {
    process.stderr.write(`Missing required env vars: ${missing.join(', ')}\n`);
    process.exit(1);
  }

  return {
    plugins: [react()],
    server: {
      port: parseInt(env.VITE_PORT || '5173', 10),
      proxy: {
        '/api': {
          target: env.VITE_API_URL,
          changeOrigin: true,
        },
      },
    },
  };
});
