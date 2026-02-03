/**
 * Code Highlighter using highlight.js
 *
 * Uses highlight.js instead of Shiki to avoid WASM/CSP issues in Electron.
 * highlight.js is pure JavaScript and works everywhere.
 */

import hljs from 'highlight.js/lib/core'

// Import only the languages we need (smaller bundle)
import bash from 'highlight.js/lib/languages/bash'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import css from 'highlight.js/lib/languages/css'
import diff from 'highlight.js/lib/languages/diff'
import go from 'highlight.js/lib/languages/go'
import graphql from 'highlight.js/lib/languages/graphql'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import kotlin from 'highlight.js/lib/languages/kotlin'
import markdown from 'highlight.js/lib/languages/markdown'
import php from 'highlight.js/lib/languages/php'
import python from 'highlight.js/lib/languages/python'
import ruby from 'highlight.js/lib/languages/ruby'
import rust from 'highlight.js/lib/languages/rust'
import scss from 'highlight.js/lib/languages/scss'
import shell from 'highlight.js/lib/languages/shell'
import sql from 'highlight.js/lib/languages/sql'
import swift from 'highlight.js/lib/languages/swift'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'

// Register languages
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('c', c)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('csharp', csharp)
hljs.registerLanguage('css', css)
hljs.registerLanguage('diff', diff)
hljs.registerLanguage('go', go)
hljs.registerLanguage('graphql', graphql)
hljs.registerLanguage('java', java)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('kotlin', kotlin)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('php', php)
hljs.registerLanguage('python', python)
hljs.registerLanguage('ruby', ruby)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('scss', scss)
hljs.registerLanguage('shell', shell)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('swift', swift)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('yaml', yaml)

// Aliases
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('tsx', typescript) // TSX uses typescript highlighting
hljs.registerLanguage('jsx', javascript) // JSX uses javascript highlighting
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('py', python)
hljs.registerLanguage('rb', ruby)
hljs.registerLanguage('rs', rust)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('zsh', bash)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('htm', xml)
hljs.registerLanguage('vue', xml)
hljs.registerLanguage('svelte', xml)

/** Map file extensions to highlight.js language identifiers */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  // JavaScript/TypeScript
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  mjs: 'javascript',
  cjs: 'javascript',

  // Web
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  vue: 'vue',
  svelte: 'svelte',

  // Data formats
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',

  // Backend languages
  py: 'python',
  rb: 'ruby',
  php: 'php',
  java: 'java',
  kt: 'kotlin',
  go: 'go',
  rs: 'rust',
  c: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  swift: 'swift',

  // Shell/Config
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  shell: 'shell',

  // Markup/Docs
  md: 'markdown',

  // Other
  sql: 'sql',
  graphql: 'graphql',
  gql: 'graphql'
}

/** Get highlight.js language from filename */
export function getHljsLanguage(fileName: string): string {
  const baseName = fileName.split('/').pop()?.toLowerCase() || ''

  // Handle special files
  if (baseName === 'dockerfile') return 'bash'
  if (baseName === 'makefile') return 'bash'
  if (baseName === '.gitignore') return 'bash'

  // Get extension
  const ext = baseName.includes('.') ? baseName.split('.').pop()?.toLowerCase() : ''

  if (ext && ext in EXTENSION_TO_LANGUAGE) {
    return EXTENSION_TO_LANGUAGE[ext]
  }

  // Return empty string for unknown - will use auto-detection
  return ''
}

/** Token with color information */
export interface HljsToken {
  content: string
  color?: string
  fontStyle?: number // 1=italic, 2=bold
}

// GitHub Dark theme colors (matches github-dark)
const GITHUB_DARK_COLORS: Record<string, string> = {
  // Keywords, control flow
  keyword: '#ff7b72',
  built_in: '#ff7b72',

  // Types
  type: '#79c0ff',
  class: '#79c0ff',
  'title.class': '#79c0ff',

  // Functions
  function: '#d2a8ff',
  'title.function': '#d2a8ff',

  // Strings
  string: '#a5d6ff',
  'template-tag': '#a5d6ff',
  'template-variable': '#a5d6ff',

  // Numbers
  number: '#79c0ff',
  literal: '#79c0ff',

  // Comments
  comment: '#8b949e',

  // Variables, params
  variable: '#ffa657',
  params: '#ffa657',
  attr: '#79c0ff',

  // Operators, punctuation
  operator: '#ff7b72',
  punctuation: '#c9d1d9',

  // Tags (HTML/XML)
  tag: '#7ee787',
  name: '#7ee787',

  // Attributes
  attribute: '#79c0ff',

  // Meta
  meta: '#8b949e',
  'meta keyword': '#ff7b72',

  // Regex
  regexp: '#a5d6ff',

  // Default
  default: '#c9d1d9'
}

/** Get color for a highlight.js class */
function getColorForClass(className: string): string {
  // Try exact match
  if (className in GITHUB_DARK_COLORS) {
    return GITHUB_DARK_COLORS[className]
  }

  // Try partial match (e.g., "hljs-keyword" -> "keyword")
  const simplified = className.replace('hljs-', '')
  if (simplified in GITHUB_DARK_COLORS) {
    return GITHUB_DARK_COLORS[simplified]
  }

  // Check for compound classes like "title.function"
  for (const key of Object.keys(GITHUB_DARK_COLORS)) {
    if (simplified.includes(key) || key.includes(simplified)) {
      return GITHUB_DARK_COLORS[key]
    }
  }

  return GITHUB_DARK_COLORS.default
}

/**
 * Tokenize a single line of code.
 * Returns an array of tokens with content and color.
 */
export function tokenizeLine(line: string, language: string): HljsToken[] {
  if (!line.trim()) {
    return [{ content: line || ' ', color: GITHUB_DARK_COLORS.default }]
  }

  try {
    // If no language specified or unknown, try auto-detection
    const result = language
      ? hljs.highlight(line, { language, ignoreIllegals: true })
      : hljs.highlightAuto(line)

    // Parse the HTML output to extract tokens
    return parseHljsHtml(result.value)
  } catch {
    // Fallback for unsupported languages - return plain text
    return [{ content: line, color: GITHUB_DARK_COLORS.default }]
  }
}

/**
 * Parse highlight.js HTML output into tokens.
 * Handles nested spans by recursively processing inner content.
 */
function parseHljsHtml(html: string): HljsToken[] {
  const tokens: HljsToken[] = []

  // Use a stack-based approach to handle nested spans
  let pos = 0
  const len = html.length

  while (pos < len) {
    // Check for span start
    if (html.slice(pos, pos + 12) === '<span class=') {
      // Find the class name
      const classStart = pos + 13 // After '<span class="'
      const classEnd = html.indexOf('"', classStart)
      if (classEnd === -1) {
        // Malformed, treat rest as plain text
        tokens.push({ content: decodeHtml(html.slice(pos)), color: GITHUB_DARK_COLORS.default })
        break
      }

      const className = html.slice(classStart, classEnd)
      const contentStart = classEnd + 2 // After '">'

      // Find matching </span> - need to handle nesting
      let depth = 1
      let contentEnd = contentStart
      while (depth > 0 && contentEnd < len) {
        if (html.slice(contentEnd, contentEnd + 6) === '<span ') {
          depth++
          contentEnd += 6
        } else if (html.slice(contentEnd, contentEnd + 7) === '</span>') {
          depth--
          if (depth === 0) break
          contentEnd += 7
        } else {
          contentEnd++
        }
      }

      // Extract inner content and recursively parse it
      const innerHtml = html.slice(contentStart, contentEnd)
      const innerTokens = parseHljsHtml(innerHtml)

      // Apply color from outer span to inner tokens that have default color
      const color = getColorForClass(className)
      for (const token of innerTokens) {
        if (token.color === GITHUB_DARK_COLORS.default) {
          token.color = color
        }
        tokens.push(token)
      }

      pos = contentEnd + 7 // Move past </span>
    } else if (html[pos] === '<') {
      // Skip unknown tags
      const tagEnd = html.indexOf('>', pos)
      if (tagEnd !== -1) {
        pos = tagEnd + 1
      } else {
        pos++
      }
    } else {
      // Plain text - find next tag or end
      let textEnd = pos
      while (textEnd < len && html[textEnd] !== '<') {
        textEnd++
      }
      const content = decodeHtml(html.slice(pos, textEnd))
      if (content) {
        tokens.push({ content, color: GITHUB_DARK_COLORS.default })
      }
      pos = textEnd
    }
  }

  return tokens.length > 0
    ? tokens
    : [{ content: decodeHtml(html), color: GITHUB_DARK_COLORS.default }]
}

/** Decode HTML entities */
function decodeHtml(html: string): string {
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
}

/**
 * Tokenize multiple lines of code.
 * Returns an array of token arrays (one per line).
 */
export async function tokenizeCode(code: string, lang: string): Promise<HljsToken[][] | null> {
  const language = getHljsLanguage(lang) || lang

  try {
    const lines = code.split('\n')
    return lines.map((line) => tokenizeLine(line, language))
  } catch (err) {
    console.error(`[Highlighter] Error tokenizing ${lang}:`, err)
    return null
  }
}

// Legacy exports for compatibility
export function preloadHighlighter(): void {
  // No-op, highlight.js is synchronous
}

export function isHighlighterReady(): boolean {
  return true
}

export function hasInitError(): boolean {
  return false
}
