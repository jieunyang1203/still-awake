import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Set to /<repo>/ in CI for GitHub Pages project sites; '/' locally.
  base: process.env.GITHUB_PAGES_BASE || '/',
  plugins: [react()],
})