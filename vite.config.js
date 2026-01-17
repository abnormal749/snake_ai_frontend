import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa'

// import path from 'node:path';
// import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
// import { playwright } from '@vitest/browser-playwright';
// const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate', 
      devOptions: { enabled: false }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    // projects: [{
    //   extends: true,
    //   plugins: [
    //   storybookTest({
    //     configDir: path.join(dirname, '.storybook')
    //   })],
    //   test: {
    //     name: 'storybook',
    //     browser: {
    //       enabled: true,
    //       headless: true,
    //       provider: playwright({}),
    //       instances: [{
    //         browser: 'chromium'
    //       }]
    //     },
    //     setupFiles: ['.storybook/vitest.setup.js']
    //   }
    // }]
  }
});