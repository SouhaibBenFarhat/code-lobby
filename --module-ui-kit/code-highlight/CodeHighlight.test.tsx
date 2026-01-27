/**
 * CodeHighlight Component Tests
 *
 * Tests for syntax highlighting component using highlight.js.
 */

import { render, screen } from '@test-utils'
import { describe, expect, it } from 'vitest'
import { CodeHighlight, getLanguageFromFileName } from './CodeHighlight'

describe('CodeHighlight', () => {
  describe('getLanguageFromFileName', () => {
    it('should detect JavaScript from .js extension', () => {
      expect(getLanguageFromFileName('app.js')).toBe('javascript')
    })

    it('should detect TypeScript from .ts extension', () => {
      expect(getLanguageFromFileName('app.ts')).toBe('typescript')
    })

    it('should detect TSX from .tsx extension', () => {
      expect(getLanguageFromFileName('Component.tsx')).toBe('typescript')
    })

    it('should detect JSX from .jsx extension', () => {
      expect(getLanguageFromFileName('Component.jsx')).toBe('javascript')
    })

    it('should detect Python from .py extension', () => {
      expect(getLanguageFromFileName('script.py')).toBe('python')
    })

    it('should detect JSON from .json extension', () => {
      expect(getLanguageFromFileName('package.json')).toBe('json')
    })

    it('should detect YAML from .yml extension', () => {
      expect(getLanguageFromFileName('config.yml')).toBe('yaml')
    })

    it('should detect YAML from .yaml extension', () => {
      expect(getLanguageFromFileName('config.yaml')).toBe('yaml')
    })

    it('should detect Dockerfile without extension', () => {
      expect(getLanguageFromFileName('Dockerfile')).toBe('bash')
    })

    it('should detect Makefile without extension', () => {
      expect(getLanguageFromFileName('Makefile')).toBe('bash')
    })

    it('should detect .gitignore files', () => {
      expect(getLanguageFromFileName('.gitignore')).toBe('bash')
    })

    it('should handle full paths', () => {
      expect(getLanguageFromFileName('src/components/Button.tsx')).toBe('typescript')
      expect(getLanguageFromFileName('packages/api/index.ts')).toBe('typescript')
    })

    it('should return empty string for unknown extensions', () => {
      expect(getLanguageFromFileName('file.unknown')).toBe('')
      expect(getLanguageFromFileName('noextension')).toBe('')
    })

    it('should detect CSS', () => {
      expect(getLanguageFromFileName('styles.css')).toBe('css')
    })

    it('should detect SCSS', () => {
      expect(getLanguageFromFileName('styles.scss')).toBe('scss')
    })

    it('should detect Go', () => {
      expect(getLanguageFromFileName('main.go')).toBe('go')
    })

    it('should detect Rust', () => {
      expect(getLanguageFromFileName('lib.rs')).toBe('rust')
    })

    it('should detect Ruby', () => {
      expect(getLanguageFromFileName('app.rb')).toBe('ruby')
    })

    it('should detect Java', () => {
      expect(getLanguageFromFileName('Main.java')).toBe('java')
    })

    it('should detect C#', () => {
      expect(getLanguageFromFileName('Program.cs')).toBe('csharp')
    })

    it('should detect Shell scripts', () => {
      expect(getLanguageFromFileName('script.sh')).toBe('bash')
      expect(getLanguageFromFileName('script.bash')).toBe('bash')
    })

    it('should detect SQL', () => {
      expect(getLanguageFromFileName('query.sql')).toBe('sql')
    })

    it('should detect GraphQL', () => {
      expect(getLanguageFromFileName('schema.graphql')).toBe('graphql')
      expect(getLanguageFromFileName('query.gql')).toBe('graphql')
    })

    it('should detect Markdown', () => {
      expect(getLanguageFromFileName('README.md')).toBe('markdown')
    })

    it('should detect HTML', () => {
      expect(getLanguageFromFileName('index.html')).toBe('xml')
      expect(getLanguageFromFileName('page.htm')).toBe('xml')
    })

    it('should detect Vue', () => {
      expect(getLanguageFromFileName('App.vue')).toBe('xml')
    })

    it('should detect Svelte', () => {
      expect(getLanguageFromFileName('Component.svelte')).toBe('xml')
    })
  })

  describe('rendering', () => {
    it('should render code content', () => {
      render(<CodeHighlight code="const x = 1;" fileName="test.ts" />)

      expect(screen.getByText(/const/)).toBeInTheDocument()
      expect(screen.getByText(/x/)).toBeInTheDocument()
    })

    it('should render with custom className', () => {
      const { container } = render(
        <CodeHighlight code="const x = 1;" fileName="test.ts" className="custom-class" />
      )

      const wrapper = container.querySelector('.custom-class')
      expect(wrapper).toBeInTheDocument()
    })

    it('should render pre element', () => {
      const { container } = render(<CodeHighlight code="const x = 1;" fileName="test.ts" />)

      const preElement = container.querySelector('pre')
      expect(preElement).toBeInTheDocument()
    })

    it('should handle empty code', () => {
      const { container } = render(<CodeHighlight code="" fileName="test.ts" />)

      // Component should still render with pre element
      const preElement = container.querySelector('pre')
      expect(preElement).toBeInTheDocument()
    })

    it('should handle multiline code', () => {
      const code = `function hello() {
  return "world";
}`
      render(<CodeHighlight code={code} fileName="test.js" />)

      expect(screen.getByText(/function/)).toBeInTheDocument()
      expect(screen.getByText(/hello/)).toBeInTheDocument()
    })

    it('should show line numbers when showLineNumbers is true', () => {
      const code = `aaa
bbb
ccc`
      const { container } = render(<CodeHighlight code={code} fileName="test.ts" showLineNumbers />)

      // Line numbers should be in spans with the select-none class
      const lineNumberSpans = container.querySelectorAll('.select-none')
      expect(lineNumberSpans.length).toBe(3)
    })

    it('should have data-line attributes', () => {
      const code = `aaa
bbb`
      const { container } = render(
        <CodeHighlight code={code} fileName="test.ts" showLineNumbers startLineNumber={10} />
      )

      // Check data-line attributes
      const lineElements = container.querySelectorAll('[data-line]')
      expect(lineElements.length).toBe(2)
      expect(lineElements[0].getAttribute('data-line')).toBe('10')
      expect(lineElements[1].getAttribute('data-line')).toBe('11')
    })
  })

  describe('language detection in component', () => {
    it('should use provided language override', () => {
      render(<CodeHighlight code="print('hello')" fileName="script.txt" language="python" />)

      expect(screen.getByText(/print/)).toBeInTheDocument()
    })

    it('should detect language from fileName', () => {
      render(<CodeHighlight code="const x: number = 1;" fileName="test.ts" />)

      expect(screen.getByText(/const/)).toBeInTheDocument()
    })
  })
})
