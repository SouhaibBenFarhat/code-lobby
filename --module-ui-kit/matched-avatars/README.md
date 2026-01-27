# MatchedAvatars

A fun, dating-app inspired component that displays PR author and assignee avatars with a heart icon between them when there's a "match" (assignment).

## Features

- **Match Animation** - Pulsing heart icon between author and assignee
- **Hover Effects** - Avatars scale up on hover
- **Pink Theme** - Romantic pink rings and colors for the "match" state
- **Tooltip** - Shows "It's a match! 💕" with names
- **Multiple Assignees** - Shows "+N" indicator for additional assignees
- **Fallback State** - Shows just the author when no assignees

## Usage

```tsx
import { MatchedAvatars } from '@ui-kit'

// Basic usage - no assignee
<MatchedAvatars 
  author={{ login: 'john', avatar_url: 'https://...' }}
/>

// With assignee - shows match UI
<MatchedAvatars 
  author={{ login: 'john', avatar_url: 'https://...' }}
  assignees={[{ login: 'jane', avatar_url: 'https://...' }]}
/>

// Medium size with names
<MatchedAvatars 
  author={pr.user}
  assignees={pr.assignees}
  size="md"
  showNames
/>

// Small size for compact views (like explorer)
<MatchedAvatars 
  author={pr.user}
  assignees={pr.assignees}
  size="sm"
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `author` | `MatchedUser` | - | The PR author/owner (required) |
| `assignees` | `MatchedUser[]` | `[]` | The assignees |
| `size` | `'sm' \| 'md'` | `'sm'` | Size variant |
| `showNames` | `boolean` | `false` | Show usernames (only with `md` size) |
| `className` | `string` | - | Additional CSS classes |

### MatchedUser Interface

```ts
interface MatchedUser {
  login: string      // GitHub username
  avatar_url: string // Avatar URL
}
```

## Visual States

### No Assignee
Shows just the author avatar with a tooltip "Author: {name}"

```
[👤 john]
```

### With Assignee (Match!)
Shows author ❤️ assignee with pink rings and pulsing heart

```
john [👤] ❤️ [👤] jane
```

### Multiple Assignees
Shows first assignee with "+N" indicator

```
[👤] ❤️ [👤] +2
```

## Size Variants

| Size | Avatar | Heart | Use Case |
|------|--------|-------|----------|
| `sm` | 16px | 8px | Explorer view, compact lists |
| `md` | 20px | 12px | PR header, detail views |

## Styling

- **Pink ring** - `ring-pink-400/50` around avatars in match state
- **Pulsing heart** - `animate-pulse` on the heart icon
- **Hover scale** - Avatars scale to 110% on group hover
- **Pink fallback** - When avatar fails to load, shows pink background

## Where It's Used

- **PR Header** (`@pr-detail`) - Shows PR author and assignee
- **IDE View Explorer** (`@explorer`) - Compact view in PR list

## Related Components

- `Avatar` - Base avatar component used internally
- `Tooltip` - Shows "It's a match!" tooltip on hover
