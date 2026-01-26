import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@logger/main': resolve('--module-logger/main.ts'),
        '@logger': resolve('--module-logger/index.ts')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@logger/main': resolve('--module-logger/main.ts'),
        '@logger': resolve('--module-logger/index.ts')
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer'),
        '@logger': resolve('--module-logger/index.ts'),
        '@slot-system': resolve('--module-slot-system/index.tsx'),
        '@data': resolve('--module-data/index.ts'),
        '@header': resolve('--module-header/index.tsx'),
        '@explorer': resolve('--module-explorer/index.tsx'),
        '@canvas': resolve('--module-canvas/index.tsx'),
        '@pr-detail': resolve('--module-pr-detail/index.tsx'),
        '@ai-chat': resolve('--module-ai-chat/index.tsx'),
        '@network': resolve('--module-network/index.tsx'),
        '@app/bootstrap': resolve('--module-app/bootstrap.ts'),
        '@app': resolve('--module-app/index.ts'),
        '@ui-kit': resolve('--module-ui-kit/index.ts'),
        '@test-utils': resolve('--module-test-utils/index.ts')
      }
    },
    plugins: [react()]
  }
})
