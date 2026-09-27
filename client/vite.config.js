import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const backendUrl = env.VITE_BACKEND_URL || 'https://localhost:7183';

  return {
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: Number(env.VITE_FRONTEND_PORT || 5173),
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  };
});
