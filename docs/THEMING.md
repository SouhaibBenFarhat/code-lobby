# CodeLobby Theming System

This document describes the semantic token system, elevation hierarchy, and conventions
for keeping the light and dark themes consistent.

---

## 1. Elevation Model

```
Level 0  --background        Content area (lowest)
Level 1  --surface           Sidebars, panels, cards
Level 2  --surface-raised    Section headers (Explorer, AI Chat, PR Detail, etc.)
Level 3  --header            App header (top bar — highest chrome)
Level 4  --overlay           Popovers, dropdowns, modals
```

- **Light mode:** each level is progressively **darker** (lower lightness %).
- **Dark mode:** each level is progressively **lighter** (higher lightness %).
- Structural surfaces use **solid colors** (no opacity tricks like `bg-card/80`).

---

## 2. Token Reference

### Surfaces

| Token              | Role                           | Light           | Dark             |
|--------------------|--------------------------------|-----------------|------------------|
| `--background`     | Content area (lowest)          | `0 0% 100%`     | `220 12% 7%`    |
| `--surface`        | Sidebars, panels, cards        | `220 5% 96%`    | `220 10% 10%`   |
| `--surface-raised` | Section headers                | `220 5% 93%`    | `220 10% 13%`   |
| `--header`         | App header (top bar)           | `220 5% 89%`    | `220 10% 17%`   |
| `--surface-hover`  | Hover state on surface         | `220 5% 91%`    | `220 10% 15%`   |
| `--overlay`        | Popovers, modals               | `0 0% 100%`     | `220 10% 18%`   |
| `--code-bg`        | Code blocks / viewers          | `220 13% 10%`   | `220 13% 7%`    |
| `--chat-bg`        | AI Chat message area           | `220 5% 92%`    | `220 12% 5%`    |
| `--chat-bubble`    | AI Chat assistant bubbles      | `0 0% 100%`     | `220 10% 12%`   |

### Text

| Token                 | Role                          | Light          | Dark          |
|-----------------------|-------------------------------|----------------|---------------|
| `--foreground`        | Primary text                  | `220 10% 10%`  | `0 0% 95%`   |
| `--foreground-muted`  | Secondary text                | `220 5% 45%`   | `220 5% 55%` |
| `--foreground-subtle` | Tertiary / hint               | `220 5% 62%`   | `220 5% 40%` |
| `--foreground-ghost`  | Decorative (icons, guides)    | `220 5% 75%`   | `220 5% 28%` |

### Borders

| Token            | Role                                        | Light         | Dark          |
|------------------|---------------------------------------------|---------------|---------------|
| `--border`       | Section dividers (header, sidebar edge)      | `220 5% 88%`  | `220 8% 20%` |
| `--border-muted` | Interior dividers (within panels, list items)| `220 5% 92%`  | `220 8% 16%` |
| `--border-subtle`| Faintest (tree guides, dashed dividers)      | `220 5% 95%`  | `220 8% 12%` |

### Interactive States

| Token                | Role                            | Light         | Dark          |
|----------------------|---------------------------------|---------------|---------------|
| `--interactive-hover`| Neutral hover for list items    | `220 5% 91%`  | `220 10% 15%`|
| `--interactive-active`| Active/pressed/selected state  | `220 5% 88%`  | `220 10% 18%`|

### Status Colors (solid + subtle pairs)

| Token                    | Role                      | Light            | Dark              |
|--------------------------|---------------------------|------------------|-------------------|
| `--destructive`          | Error (solid)             | `0 84% 50%`      | `0 100% 60%`     |
| `--destructive-subtle`   | Error tinted bg           | `0 50% 95%`      | `0 30% 14%`      |
| `--destructive-border`   | Error container border    | `0 40% 85%`      | `0 25% 22%`      |
| `--success`              | Success (solid)           | `142 71% 45%`    | `142 71% 45%`    |
| `--success-subtle`       | Success tinted bg         | `142 40% 94%`    | `142 25% 13%`    |
| `--success-border`       | Success container border  | `142 30% 82%`    | `142 20% 20%`    |
| `--warning`              | Warning (solid)           | `38 92% 50%`     | `38 92% 50%`     |
| `--warning-subtle`       | Warning tinted bg         | `38 50% 94%`     | `38 25% 13%`     |
| `--warning-border`       | Warning container border  | `38 40% 82%`     | `38 20% 20%`     |
| `--info`                 | Info accent (blue)        | `211 80% 55%`    | `211 80% 55%`    |
| `--info-subtle`          | Info tinted bg            | `211 50% 95%`    | `211 25% 14%`    |
| `--info-border`          | Info container border     | `211 40% 85%`    | `211 20% 22%`    |

### Shadows

| Token                       | Light                              | Dark                               |
|-----------------------------|------------------------------------|-------------------------------------|
| `--shadow-elevation-low`    | `0 1px 2px rgba(0,0,0,0.05)`      | `0 1px 2px rgba(0,0,0,0.3)`       |
| `--shadow-elevation-medium` | `0 2px 8px -2px rgba(0,0,0,0.1)`  | `0 2px 8px -2px rgba(0,0,0,0.4)`  |
| `--shadow-elevation-high`   | `0 8px 24px rgba(0,0,0,0.12)`     | `0 8px 24px rgba(0,0,0,0.5)`      |

### Backward-Compatible Aliases

These map to the new tokens so existing `bg-card`, `bg-muted`, etc. still work:

| Alias                 | Resolves to            |
|-----------------------|------------------------|
| `--card`              | `var(--surface)`       |
| `--popover`           | `var(--overlay)`       |
| `--muted`             | `var(--surface)` (light) / `var(--surface-raised)` (dark) |
| `--muted-foreground`  | `var(--foreground-muted)` |
| `--accent`            | `var(--surface-hover)` |
| `--secondary`         | `var(--surface)` (light) / `var(--surface-raised)` (dark) |

---

## 3. CSS Classes

| Class              | Purpose                         | Background               | Border / Shadow                       |
|--------------------|---------------------------------|--------------------------|---------------------------------------|
| `.header-bar`      | App header (frosted glass)      | `--header / 0.92` + backdrop-blur | `--border` bottom + `--shadow-elevation-medium` |
| `.section-header`  | Panel/section headers (solid)   | `--surface-raised`       | `--border` bottom + `--shadow-elevation-low` |
| `.apple-sidebar`   | Left sidebar (Explorer)         | `--surface`              | `--border` right                      |
| `.apple-panel`     | Right panel (AI, Network)       | `--surface`              | `--border` left                       |
| `.elevated-panel`  | Floating panels                 | `--surface-raised`       | `--border` + `--shadow-elevation-high` |
| `.pr-card-item`    | PR list cards                   | `--surface` / `--surface-hover` / `--primary` | `--border-muted` / `--border`  |

---

## 4. UI -> Token Mapping

| UI Element              | Token / Class         |
|-------------------------|-----------------------|
| Page / main content     | `bg-background`       |
| App header              | `.header-bar`         |
| Explorer sidebar        | `.apple-sidebar`      |
| Explorer header         | `.section-header`     |
| AI Chat header          | `.section-header`     |
| AI Chat message area    | `bg-chat`             |
| AI Chat bubbles         | `bg-chat-bubble`      |
| PR Detail header        | `.section-header`     |
| Network header          | `.section-header`     |
| Right panel (AI/Net)    | `.apple-panel`        |
| Canvas repo cards       | `.section-header` (card header) + `bg-surface` |
| Popovers / dropdowns    | `bg-overlay`          |
| Floating windows        | `bg-overlay`          |
| Token input card        | `bg-surface`          |
| Code blocks             | `bg-code`             |

---

## 5. Tailwind Utilities

All utilities available via `tailwind.config.js`:

### Surfaces
| Utility               | CSS Variable          |
|------------------------|-----------------------|
| `bg-surface`           | `--surface`           |
| `bg-surface-raised`    | `--surface-raised`    |
| `bg-surface-hover`     | `--surface-hover`     |
| `bg-overlay`           | `--overlay`           |
| `bg-code`              | `--code-bg`           |
| `bg-chat`              | `--chat-bg`           |
| `bg-chat-bubble`       | `--chat-bubble`       |

### Text
| Utility                  | CSS Variable          |
|---------------------------|-----------------------|
| `text-foreground`         | `--foreground`        |
| `text-foreground-muted`   | `--foreground-muted`  |
| `text-foreground-subtle`  | `--foreground-subtle` |
| `text-foreground-ghost`   | `--foreground-ghost`  |

### Borders
| Utility               | CSS Variable          |
|------------------------|-----------------------|
| `border-border`        | `--border`            |
| `border-border-muted`  | `--border-muted`      |
| `border-border-subtle` | `--border-subtle`     |

### Interactive
| Utility                   | CSS Variable          |
|----------------------------|-----------------------|
| `bg-interactive-hover`     | `--interactive-hover` |
| `bg-interactive-active`    | `--interactive-active`|
| `hover:bg-interactive-hover` | Hover state        |

### Status (solid + subtle + border)
| Utility                 | CSS Variable            |
|--------------------------|-------------------------|
| `bg-destructive-subtle`  | `--destructive-subtle`  |
| `border-destructive-border` | `--destructive-border` |
| `bg-success-subtle`      | `--success-subtle`      |
| `border-success-border`  | `--success-border`      |
| `bg-warning-subtle`      | `--warning-subtle`      |
| `border-warning-border`  | `--warning-border`      |
| `bg-info-subtle`         | `--info-subtle`         |
| `border-info-border`     | `--info-border`         |
| `text-info`              | `--info`                |

### Shadows
| Utility                  | CSS Variable              |
|---------------------------|---------------------------|
| `shadow-elevation-low`    | `--shadow-elevation-low`  |
| `shadow-elevation-medium` | `--shadow-elevation-medium` |
| `shadow-elevation-high`   | `--shadow-elevation-high` |

---

## 6. Rules for Contributors

1. **No hardcoded hex/rgba for structural UI.** Use CSS variables or Tailwind theme classes.
2. **No opacity on structural backgrounds.** Don't use `bg-card/80`, `bg-muted/50`, etc.
   Use solid tokens: `bg-surface`, `bg-surface-raised`, `bg-background`.
3. **Headers use `.section-header`.** Don't hand-roll header styling.
4. **Borders:** Use `border-border` (structural), `border-border-muted` (interior),
   `border-border-subtle` (faintest guides/dividers).
5. **Text:** Use `text-foreground`, `text-foreground-muted`, `text-foreground-subtle`,
   `text-foreground-ghost` (decorative only).
6. **Hover states:** Use `hover:bg-interactive-hover` for neutral items.
   Use `hover:bg-destructive-subtle` for destructive actions.
7. **Status containers:** Use `bg-success-subtle border-success-border`,
   `bg-destructive-subtle border-destructive-border`, etc.
8. **Code blocks:** Use `bg-code`.
9. **Chat area:** Use `bg-chat` for message scroll area, `bg-chat-bubble` for assistant bubbles.
10. **Keep light/dark rule:** light = darker surface is higher; dark = lighter surface is higher.

### Adding a new token

1. Add the variable in `globals.css` under both `:root` and `.dark`.
2. Add the Tailwind mapping in `tailwind.config.js` `theme.extend.colors`.
3. Update this doc.

---

## 7. Out of Scope (intentional hardcoding)

- **Syntax highlighting** colors (`.hljs-*`, `highlighter.ts`) — standard code palettes.
- **Brand colors** — Claude icon (`#D97757`), CodeLobby logo (`#141B4D`), AI cost purple.
- **Repo card palette** — decorative colors for canvas cards.
- **GitHub label colors** — dynamic from GitHub API.
- **macOS traffic light buttons** — red/yellow/green in `FloatingWindow.tsx`.
- **File type icon colors** — `text-blue-400` (JS), `text-yellow-400` (JSON), etc.
- **Contribution heatmap** — GitHub-style green intensity scale.
- **Streaming state indicators** — violet/amber/emerald/blue for AI operation states.
- **Approve/merge button greens** — `bg-green-600` on action buttons.

---

## 8. Files

| File | Role |
|------|------|
| `src/renderer/styles/globals.css` | All CSS variables + global theme classes |
| `tailwind.config.js` | Theme colors, shadows, dark mode config |
| `docs/THEMING.md` | This document |
