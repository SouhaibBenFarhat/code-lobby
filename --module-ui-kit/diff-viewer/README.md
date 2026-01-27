# DiffViewer

A reusable component for displaying unified diff patches with syntax highlighting and inline comments.

## Features

- **Syntax Highlighting** - Powered by highlight.js for language-aware code coloring
- **Line Numbers** - Dual columns showing old/new line numbers
- **Diff Styling** - Green backgrounds for additions, red for deletions
- **Hunk Headers** - Displays `@@ -x,y +x,y @@` markers
- **Inline Comments** - Display comments below specific lines
- **Custom Comment Rendering** - Provide your own comment UI via `renderComment`
- **Caching** - Token cache prevents re-highlighting the same content

## Usage

### Basic Usage

```tsx
import { DiffViewer } from '@ui-kit'

<DiffViewer 
  patch={file.patch} 
  fileName="src/utils/helper.ts" 
/>
```

### With Inline Comments

```tsx
import { DiffViewer, type DiffComment } from '@ui-kit'

const comments: DiffComment[] = [
  { id: '1', line: 5, content: 'Consider using a constant here' },
  { id: '2', line: 12, content: 'This could cause a memory leak' }
]

<DiffViewer 
  patch={file.patch} 
  fileName="src/utils/helper.ts"
  comments={comments}
/>
```

### Custom Comment Rendering

```tsx
import { DiffViewer, type DiffComment } from '@ui-kit'

<DiffViewer 
  patch={file.patch} 
  fileName="src/utils/helper.ts"
  comments={comments}
  renderComment={(comment) => (
    <div className="my-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
      <p className="font-medium">Review Comment</p>
      <p>{comment.content}</p>
      <button onClick={() => deleteComment(comment.id)}>Delete</button>
    </div>
  )}
/>
```

### With React Node Content

```tsx
const comments: DiffComment[] = [
  { 
    id: '1', 
    line: 5, 
    content: (
      <div className="flex items-center gap-2">
        <Avatar src={user.avatar} />
        <span>{user.name}: Great catch!</span>
      </div>
    )
  }
]

<DiffViewer 
  patch={patch} 
  fileName="file.ts"
  comments={comments}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `patch` | `string \| null` | Yes | - | The unified diff patch string |
| `fileName` | `string` | Yes | - | Filename used for language detection |
| `className` | `string` | No | - | Additional CSS classes for the container |
| `comments` | `DiffComment[]` | No | `[]` | Inline comments to display |
| `renderComment` | `(comment: DiffComment) => ReactNode` | No | - | Custom render function for comments |

### DiffComment Interface

```ts
interface DiffComment {
  /** Unique identifier for the comment */
  id: string
  /** Line number (new file line number) where comment appears */
  line: number
  /** Comment content - can be string or React node */
  content?: React.ReactNode
}
```

## Diff Format

The component expects standard unified diff format:

```diff
@@ -1,3 +1,4 @@
 unchanged line
-removed line
+added line
 another unchanged line
```

### Line Types

| Prefix | Type | Styling |
|--------|------|---------|
| `@@` | Hunk header | Blue background, bold |
| `+` | Addition | Green background |
| `-` | Deletion | Red background |
| ` ` (space) | Context | No background |
| `\` | Info (e.g., "No newline") | Italic, muted |

## Comment Positioning

Comments are positioned by **new line number** (the right column):

```diff
@@ -1,3 +1,4 @@
 line 1        ← newLineNum: 1 (comments with line: 1 appear here)
+added line    ← newLineNum: 2 (comments with line: 2 appear here)
 line 2        ← newLineNum: 3 (comments with line: 3 appear here)
-deleted line  ← NO newLineNum (comments won't appear on deleted lines)
 line 3        ← newLineNum: 4 (comments with line: 4 appear here)
```

**Note:** Comments cannot be attached to deleted lines (they have no new line number).

## Language Detection

Language is automatically detected from the filename extension:

- `.ts`, `.tsx` → TypeScript
- `.js`, `.jsx` → JavaScript  
- `.py` → Python
- `.json` → JSON
- `.css`, `.scss` → CSS/SCSS
- And many more...

## Architecture

```
DiffViewer
├── parseDiffLines()        # Parses patch string into structured lines
├── tokenizeLine()          # Syntax highlighting (from code-highlight)
├── tokenCache              # Caches highlighted tokens
├── commentsByLine          # Maps line numbers to comments
├── HighlightedLine         # Renders tokens with colors
└── DefaultCommentDisplay   # Default comment UI (blue box)
```

## Default Comment Styling

When no `renderComment` is provided, comments display with:
- Blue background (`bg-blue-500/10`)
- Blue border (`border-blue-500/30`)
- Rounded corners
- Sans-serif font

## Performance

- **Synchronous highlighting** - highlight.js is sync, no loading states needed
- **Token caching** - Results cached by filename + patch prefix (max 50 entries)
- **Memoization** - Lines, language detection, and comment mapping are memoized

## Use Cases

1. **PR Detail View** - Showing file changes without comments
2. **Code Review** - Displaying reviewer comments inline with changes
3. **Review Preview** - Previewing AI-generated review comments before submission
4. **Diff Comparison** - Any context where unified diffs need display

## Related Components

- `CodeHighlight` - For displaying standalone code blocks (not diffs)
