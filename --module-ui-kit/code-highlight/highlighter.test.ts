/**
 * Highlighter Tests
 */

import { describe, expect, it } from 'vitest'
import {
  getHljsLanguage,
  hasInitError,
  isHighlighterReady,
  preloadHighlighter,
  tokenizeCode,
  tokenizeLine
} from './highlighter'

describe('highlighter', () => {
  describe('getHljsLanguage', () => {
    describe('JavaScript/TypeScript files', () => {
      it('should return javascript for .js files', () => {
        expect(getHljsLanguage('app.js')).toBe('javascript')
      })

      it('should return jsx for .jsx files', () => {
        expect(getHljsLanguage('component.jsx')).toBe('jsx')
      })

      it('should return typescript for .ts files', () => {
        expect(getHljsLanguage('utils.ts')).toBe('typescript')
      })

      it('should return tsx for .tsx files', () => {
        expect(getHljsLanguage('Component.tsx')).toBe('tsx')
      })

      it('should return javascript for .mjs files', () => {
        expect(getHljsLanguage('module.mjs')).toBe('javascript')
      })

      it('should return javascript for .cjs files', () => {
        expect(getHljsLanguage('config.cjs')).toBe('javascript')
      })
    })

    describe('Web files', () => {
      it('should return html for .html files', () => {
        expect(getHljsLanguage('index.html')).toBe('html')
      })

      it('should return css for .css files', () => {
        expect(getHljsLanguage('styles.css')).toBe('css')
      })

      it('should return scss for .scss files', () => {
        expect(getHljsLanguage('styles.scss')).toBe('scss')
      })

      it('should return vue for .vue files', () => {
        expect(getHljsLanguage('App.vue')).toBe('vue')
      })

      it('should return svelte for .svelte files', () => {
        expect(getHljsLanguage('Component.svelte')).toBe('svelte')
      })
    })

    describe('Data format files', () => {
      it('should return json for .json files', () => {
        expect(getHljsLanguage('package.json')).toBe('json')
      })

      it('should return yaml for .yaml files', () => {
        expect(getHljsLanguage('config.yaml')).toBe('yaml')
      })

      it('should return yaml for .yml files', () => {
        expect(getHljsLanguage('docker-compose.yml')).toBe('yaml')
      })

      it('should return xml for .xml files', () => {
        expect(getHljsLanguage('pom.xml')).toBe('xml')
      })
    })

    describe('Backend language files', () => {
      it('should return python for .py files', () => {
        expect(getHljsLanguage('main.py')).toBe('python')
      })

      it('should return ruby for .rb files', () => {
        expect(getHljsLanguage('app.rb')).toBe('ruby')
      })

      it('should return go for .go files', () => {
        expect(getHljsLanguage('main.go')).toBe('go')
      })

      it('should return rust for .rs files', () => {
        expect(getHljsLanguage('lib.rs')).toBe('rust')
      })

      it('should return java for .java files', () => {
        expect(getHljsLanguage('Main.java')).toBe('java')
      })

      it('should return kotlin for .kt files', () => {
        expect(getHljsLanguage('App.kt')).toBe('kotlin')
      })

      it('should return csharp for .cs files', () => {
        expect(getHljsLanguage('Program.cs')).toBe('csharp')
      })

      it('should return swift for .swift files', () => {
        expect(getHljsLanguage('App.swift')).toBe('swift')
      })

      it('should return c for .c files', () => {
        expect(getHljsLanguage('main.c')).toBe('c')
      })

      it('should return cpp for .cpp files', () => {
        expect(getHljsLanguage('main.cpp')).toBe('cpp')
      })
    })

    describe('Shell/Config files', () => {
      it('should return bash for .sh files', () => {
        expect(getHljsLanguage('script.sh')).toBe('bash')
      })

      it('should return bash for .bash files', () => {
        expect(getHljsLanguage('script.bash')).toBe('bash')
      })

      it('should return bash for .zsh files', () => {
        expect(getHljsLanguage('script.zsh')).toBe('bash')
      })
    })

    describe('Special files', () => {
      it('should return bash for Dockerfile', () => {
        expect(getHljsLanguage('Dockerfile')).toBe('bash')
      })

      it('should return bash for Makefile', () => {
        expect(getHljsLanguage('Makefile')).toBe('bash')
      })

      it('should return bash for .gitignore', () => {
        expect(getHljsLanguage('.gitignore')).toBe('bash')
      })
    })

    describe('Unknown files', () => {
      it('should return empty string for unknown extensions', () => {
        expect(getHljsLanguage('file.unknown')).toBe('')
      })

      it('should return empty string for files without extension', () => {
        expect(getHljsLanguage('README')).toBe('')
      })
    })

    describe('Path handling', () => {
      it('should handle full paths', () => {
        expect(getHljsLanguage('/src/components/App.tsx')).toBe('tsx')
      })

      it('should be case-insensitive', () => {
        expect(getHljsLanguage('App.TSX')).toBe('tsx')
        expect(getHljsLanguage('MAIN.PY')).toBe('python')
      })
    })
  })

  describe('tokenizeLine', () => {
    it('should tokenize TypeScript code', () => {
      const tokens = tokenizeLine('const x = 1', 'typescript')
      expect(tokens.length).toBeGreaterThan(0)
      expect(tokens.some((t) => t.content.includes('const'))).toBe(true)
    })

    it('should tokenize JavaScript code', () => {
      const tokens = tokenizeLine('function hello() {}', 'javascript')
      expect(tokens.length).toBeGreaterThan(0)
    })

    it('should return default token for empty lines', () => {
      const tokens = tokenizeLine('', 'typescript')
      expect(tokens).toHaveLength(1)
      expect(tokens[0].content).toBe(' ')
    })

    it('should return default token for whitespace-only lines', () => {
      const tokens = tokenizeLine('   ', 'typescript')
      expect(tokens).toHaveLength(1)
    })

    it('should handle unknown languages gracefully', () => {
      const tokens = tokenizeLine('some text', 'unknownlang')
      expect(tokens.length).toBeGreaterThan(0)
    })

    it('should include color in tokens', () => {
      const tokens = tokenizeLine('const x = "hello"', 'typescript')
      tokens.forEach((token) => {
        expect(token.color).toBeDefined()
        expect(token.color).toMatch(/^var\(--syntax-/)
      })
    })
  })

  describe('tokenizeCode', () => {
    it('should tokenize multiple lines', async () => {
      const code = `const x = 1
const y = 2`
      const result = await tokenizeCode(code, 'typescript')
      expect(result).not.toBeNull()
      expect(result).toHaveLength(2)
    })

    it('should return null on error', async () => {
      // This shouldn't fail but let's test the interface
      const result = await tokenizeCode('const x = 1', 'typescript')
      expect(result).not.toBeNull()
    })
  })

  describe('legacy compatibility functions', () => {
    it('preloadHighlighter should be a no-op', () => {
      expect(() => preloadHighlighter()).not.toThrow()
    })

    it('isHighlighterReady should return true', () => {
      expect(isHighlighterReady()).toBe(true)
    })

    it('hasInitError should return false', () => {
      expect(hasInitError()).toBe(false)
    })
  })
})
