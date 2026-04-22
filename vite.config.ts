import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
const manualChunks = (id: string) => {
  if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
    return 'react-vendor'
  }
  if (id.includes('node_modules/react-router')) {
    return 'router'
  }
  if (id.includes('node_modules/lucide-react')) {
    return 'icons'
  }
}

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '::',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
    chunkSizeWarningLimit: 800,
    minify: true,
    cssCodeSplit: true,
    sourcemap: false,
  },
})
