import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@logger/main': resolve('__module__logger/main.ts'),
        '@logger': resolve('__module__logger/index.ts')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@logger/main': resolve('__module__logger/main.ts'),
        '@logger': resolve('__module__logger/index.ts')
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer'),
        '@logger': resolve('__module__logger/index.ts'),
        '@slot-system': resolve('__module__slot-system/index.tsx'),
        '@data': resolve('__module__data/index.ts'),
        '@header': resolve('__module__header/index.tsx'),
        '@explorer': resolve('__module__explorer/index.tsx'),
        '@canvas': resolve('__module__canvas/index.tsx'),
        '@pr-detail': resolve('__module__pr-detail/index.tsx'),
        '@ai-chat': resolve('__module__ai-chat/index.tsx'),
        '@network': resolve('__module__network/index.tsx'),
        '@app/bootstrap': resolve('__module__app/bootstrap.ts'),
        '@app': resolve('__module__app/index.ts'),
        '@ui-kit': resolve('__module__ui-kit/index.ts'),
        '@test-utils': resolve('__module__test-utils/index.ts')
      }
    },
    plugins: [react()]
  }
})
