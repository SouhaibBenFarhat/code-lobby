# CodeHighlight

A syntax highlighting component for displaying code snippets with VS Code-like coloring.

## Features

- **Syntax Highlighting** - Powered by highlight.js with GitHub Dark theme
- **Language Detection** - Automatic detection from filename
- **Line Numbers** - Optional line number display
- **Line Highlighting** - Highlight specific lines
- **Pure JavaScript** - No WebAssembly, works everywhere (including Electron)

## Usage

```tsx
import { CodeHighlight } from '@ui-kit'

// Basic usage with filename
<CodeHighlight 
  code="const x = 1;" 
  fileName="example.ts" 
/>

// With line numbers
<CodeHighlight 
  code={codeString}
  fileName="app.tsx"
  showLineNumbers
/>

// With highlighted lines
<CodeHighlight 
  code={codeString}
  fileName="utils.js"
  showLineNumbers
  highlightLines={[3, 5, 6]}
/>

// Override language detection
<CodeHighlight 
  code="print('hello')"
  language="python"
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `code` | `string` | - | The code content to highlight |
| `fileName` | `string` | `''` | Filename for language detection |
| `language` | `string` | - | Override language detection |
| `showLineNumbers` | `boolean` | `false` | Show line numbers |
| `startLineNumber` | `number` | `1` | Starting line number |
| `highlightLines` | `number[]` | `[]` | Lines to highlight (1-indexed) |
| `className` | `string` | - | Additional CSS classes |

## Language Support

### Automatic Detection

Language is detected from file extensions:

| Extensions | Language |
|------------|----------|
| `.js`, `.jsx`, `.mjs`, `.cjs` | JavaScript |
| `.ts`, `.tsx` | TypeScript |
| `.py` | Python |
| `.json` | JSON |
| `.yaml`, `.yml` | YAML |
| `.css`, `.scss` | CSS/SCSS |
| `.html`, `.htm` | HTML |
| `.md` | Markdown |
| `.go` | Go |
| `.rs` | Rust |
| `.java` | Java |
| `.rb` | Ruby |
| `.php` | PHP |
| `.sql` | SQL |
| `.graphql`, `.gql` | GraphQL |
| `.sh`, `.bash` | Bash |

### Special Files

- `Dockerfile` → Bash highlighting
- `Makefile` → Bash highlighting
- `.gitignore` → Bash highlighting

## Utility Functions

### getLanguageFromFileName

```tsx
import { getLanguageFromFileName } from '@ui-kit'

getLanguageFromFileName('app.tsx')      // 'typescript'
getLanguageFromFileName('config.json')  // 'json'
getLanguageFromFileName('Dockerfile')   // 'bash'
```

## Architecture

```
CodeHighlight
├── getLanguageFromFileName()   # Extension → language mapping
├── tokenizeLine()              # From highlighter.ts
└── HighlightedLine             # Renders tokens with colors
```

### Internal: highlighter.ts

The highlighting engine (not exported publicly):

- Uses highlight.js with registered languages
- GitHub Dark color theme
- Parses highlight.js HTML into token objects
- Each token has `content` and `color` properties

## Theme

Uses GitHub Dark theme colors:

| Token Type | Color |
|------------|-------|
| Keywords | `#ff7b72` (red) |
| Strings | `#a5d6ff` (light blue) |
| Functions | `#d2a8ff` (purple) |
| Types | `#79c0ff` (blue) |
| Comments | `#8b949e` (gray) |
| Variables | `#ffa657` (orange) |
| Tags | `#7ee787` (green) |

## Why highlight.js?

We chose highlight.js over Shiki because:

1. **No WebAssembly** - Shiki uses Oniguruma (WASM), which conflicts with Electron's Content Security Policy
2. **Synchronous** - No async loading, simpler component logic
3. **Lightweight** - Smaller bundle, only loads needed languages
4. **Battle-tested** - Widely used, well-maintained

## Related Components

- `DiffViewer` - For displaying unified diffs (uses this component's highlighting internally)
