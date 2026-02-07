# Theming System

CodeLobby uses an **OKLCH-based token system** with a single source of truth. All colors in the app flow from one config file through a generator script into CSS variables that every component references semantically.

## Architecture Overview

```
theme.config.mjs          ← Single source of truth (token definitions)
       │
       ▼
generate-theme.mjs         ← Build script (validates + generates CSS)
       │
       ▼
globals.css                ← CSS variables (auto-generated between markers)
       │
       ├──▶ Tailwind classes     (bg-surface, text-foreground, etc.)
       ├──▶ Structural classes   (.header-bar, .section-header, etc.)
       └──▶ Component styles     (inline var() references)
```

## Key Files

| File | Purpose |
|------|---------|
| `src/renderer/styles/theme.config.mjs` | Token definitions — lightness, chroma, role per token |
| `scripts/generate-theme.mjs` | Generator script — validates and writes CSS variables |
| `src/renderer/styles/globals.css` | Output — CSS variables + structural theme classes |
| `tailwind.config.js` | Maps CSS variables to Tailwind utility classes |

## How It Works

### 1. Token Definitions (`theme.config.mjs`)

Every color is defined as an OKLCH triplet:
- **L** (lightness): 0 = black, 1 = white
- **C** (chroma): 0 = gray, higher = more vivid
- **H** (hue): derived from the token's `role`

```js
export const roles = {
  neutral:     { hue: 264 },   // Cool blue-gray
  primary:     { hue: 250 },   // Brand blue
  destructive: { hue: 27  },   // Red
  success:     { hue: 155 },   // Green
  warning:     { hue: 80  },   // Amber
  info:        { hue: 250 },   // Blue
}

export const lightTokens = {
  'background':     { role: 'neutral', l: 1.000, c: 0     },
  'surface':        { role: 'neutral', l: 0.958, c: 0.006 },
  'surface-raised': { role: 'neutral', l: 0.944, c: 0.007 },
  'header':         { role: 'neutral', l: 0.850, c: 0.015 },
  // ...
}

export const darkTokens = {
  'background':     { role: 'neutral', l: 0.145, c: 0.012 },
  'surface':        { role: 'neutral', l: 0.185, c: 0.011 },
  'surface-raised': { role: 'neutral', l: 0.202, c: 0.010 },
  'header':         { role: 'neutral', l: 0.310, c: 0.014 },
  // ...
}
```

Light and dark tokens are **independent** — there's no automatic mirroring. However, the same CSS variable names are used in both modes, so components that reference `var(--surface)` automatically get the correct value for the active mode.

### 2. Generation (`pnpm generate:theme`)

The script:
1. Imports token definitions from `theme.config.mjs`
2. **Validates** — checks role references, L/C ranges, WCAG contrast ratios, elevation ordering
3. **Formats** each token as OKLCH channels: `"L C H"` (without the `oklch()` wrapper, so Tailwind can append `/ alpha`)
4. **Injects** into `globals.css` between marker comments (`GENERATED:LIGHT:START` / `GENERATED:LIGHT:END`)

Run it after any change to `theme.config.mjs`:

```bash
pnpm generate:theme
```

### 3. CSS Variables (auto-generated in `globals.css`)

The generator produces variables like:

```css
:root {
  /* GENERATED:LIGHT:START */
  --background: 1.000 0.0000 0.0;
  --surface: 0.958 0.0060 264.0;
  --surface-raised: 0.944 0.0070 264.0;
  /* ... */
  /* GENERATED:LIGHT:END */
}

.dark {
  /* GENERATED:DARK:START */
  --background: 0.145 0.0120 264.0;
  --surface: 0.185 0.0110 264.0;
  --surface-raised: 0.202 0.0100 264.0;
  /* ... */
  /* GENERATED:DARK:END */
}
```

**Important:** Never edit values between the `GENERATED:*:START/END` markers by hand — they get overwritten on next generation.

### 4. Non-Generated CSS (manual, in `globals.css`)

Everything **outside** the markers is manually maintained:
- Shadow tokens (`--shadow-elevation-low/medium/high`)
- Structural classes (`.header-bar`, `.section-header`, `.apple-sidebar`, etc.)
- Animation keyframes
- Backward-compatible aliases (`--card`, `--muted`, etc.)

## Token Reference

### Surface Hierarchy (Elevation)

Surfaces form an elevation ladder. In light mode, higher = darker. In dark mode, higher = lighter.

```
Light:  background(1.000) → surface(0.958) → surface-raised(0.944) → header(0.850)
                            ──── getting darker (lower L) ──────────────────────→

Dark:   background(0.145) → surface(0.185) → surface-raised(0.202) → header(0.310)
                            ──── getting lighter (higher L) ────────────────────→
```

| Token | Light L | Dark L | Used For |
|-------|---------|--------|----------|
| `--background` | 1.000 | 0.145 | Content canvas, base level |
| `--surface-content` | 0.978 | 0.160 | Content-zone headers (PR detail) |
| `--surface` | 0.958 | 0.185 | Panels, sidebars, cards |
| `--surface-raised` | 0.944 | 0.202 | Chrome-zone headers, tab bars |
| `--header` | 0.850 | 0.310 | App header bar (highest chrome) |
| `--surface-hover` | 0.930 | 0.222 | Hover feedback on surfaces |
| `--overlay` | 1.000 | 0.275 | Popovers, dropdowns |

### Text Hierarchy

| Token | Light L | Dark L | Use |
|-------|---------|--------|-----|
| `--foreground` | 0.175 | 0.960 | Primary text |
| `--foreground-muted` | 0.470 | 0.625 | Secondary text, labels |
| `--foreground-subtle` | 0.620 | 0.490 | Tertiary, hints |
| `--foreground-ghost` | 0.750 | 0.365 | Placeholder, disabled |

### Border Hierarchy

| Token | Light L | Dark L | Use |
|-------|---------|--------|-----|
| `--border` | 0.860 | 0.290 | Primary borders (strong separation) |
| `--border-muted` | 0.900 | 0.250 | Softer borders |
| `--border-subtle` | 0.935 | 0.210 | Lightest borders (dividers) |

### Semantic Colors

| Token | Purpose |
|-------|---------|
| `--primary` / `--primary-foreground` | Brand blue, CTAs |
| `--destructive` / `-subtle` / `-border` | Errors, deletions |
| `--success` / `-subtle` / `-border` | Success states |
| `--warning` / `-subtle` / `-border` | Warning states |
| `--info` / `-subtle` / `-border` | Informational |

### Shadow Tokens (manual, not generated)

Defined directly in `globals.css`, different values per mode:

| Token | Use |
|-------|-----|
| `--shadow-elevation-low` | Cards, subtle depth |
| `--shadow-elevation-medium` | Header bar, hover cards |
| `--shadow-elevation-high` | Floating panels, modals |

## Structural CSS Classes

These classes live in `globals.css` (outside the generated markers) and use the semantic tokens:

| Class | Background Token | Extras | Used For |
|-------|-----------------|--------|----------|
| `.header-bar` | `--header / 0.95` | Backdrop blur, shadow-medium, border | App header (frosted glass) |
| `.section-header` | `--surface-raised` | Border-muted bottom | Panel section headers |
| `.content-header` | `--surface-content` | Border-muted bottom | Content-zone headers |
| `.apple-sidebar` | `--background` | — | Left sidebar |
| `.apple-panel` | `--surface` | — | Right panel |
| `.elevated-panel` | `--surface-raised` | Border, shadow-high | Floating panels |
| `.pr-card-item` | `--surface` | Border-muted, radius, transitions | PR list cards |

## How to Change a Color

### Adjusting an existing token

1. Open `src/renderer/styles/theme.config.mjs`
2. Find the token in `lightTokens` and/or `darkTokens`
3. Adjust `l` (lightness) and/or `c` (chroma)
4. Run `pnpm generate:theme`

**Remember:** Light and dark tokens are independent. If you change a surface level in light mode, make the corresponding change in dark mode (opposite direction — see elevation rules above).

### Changing a hue globally

Edit the `roles` object:

```js
export const roles = {
  neutral: { hue: 264 },  // Change this to shift all neutral colors
  primary: { hue: 250 },  // Change this to shift the brand color
}
```

Every token referencing that role picks up the new hue. Run `pnpm generate:theme`.

### Changing which token a component uses

If a component looks too dark/light, you usually don't need to change the token value — just swap which token it references. For example, changing a sidebar from `--surface` to `--background` semantically lowers its elevation (lighter in light mode, darker in dark mode) and automatically adapts in both modes.

## How to Add a New Theme

### Step 1: Define tokens

Add a new export to `theme.config.mjs`:

```js
export const warmLightTokens = {
  'background': { role: 'neutral', l: 1.000, c: 0 },
  'surface':    { role: 'neutral', l: 0.960, c: 0.010 },
  // ... all required tokens
}
```

You can change the `roles` hues too for a completely different palette (e.g. warm neutrals at hue 45 instead of 264).

### Step 2: Update the generator

In `scripts/generate-theme.mjs`, add a new marker pair and generation block:

```js
const WARM_START = '/* GENERATED:WARM:START */'
const WARM_END = '/* GENERATED:WARM:END */'
// ...
css = replaceBetweenMarkers(css, WARM_START, WARM_END, warmCSS)
```

### Step 3: Add CSS markers

In `globals.css`, add a new theme class with markers:

```css
.theme-warm {
  /* GENERATED:WARM:START */
  /* GENERATED:WARM:END */
}
```

### Step 4: Wire up the theme switcher

Apply the theme class to the root element (instead of or alongside `.dark`).

## Validation & Troubleshooting

### The generator validates automatically

When you run `pnpm generate:theme`, it checks:
- **Role references** — every token must reference a role that exists in `roles`
- **L/C ranges** — lightness must be 0–1, chroma must be 0–0.4
- **WCAG contrast** — foreground/background must be >= 4.5:1, foreground-muted/surface >= 3.0:1
- **Elevation ordering** — surfaces must follow the correct direction (light: descending L, dark: ascending L)

Errors abort generation. Warnings are printed but don't block.

### Common issues

| Problem | Cause | Fix |
|---------|-------|-----|
| Section header blends with sidebar | `surface-raised` too close to `surface` | Increase the L gap between them in the config |
| Text hard to read | Insufficient contrast | Check L values — foreground needs high contrast with its background surface |
| Hover not visible | `surface-hover` too close to `surface` | Increase the L gap for hover tokens |
| Dark mode looks washed out | Dark surfaces too light | Lower L values for dark mode surfaces |
| Borders invisible | Border L too close to surface L | Ensure >= 0.05 gap between border and surface lightness |
| Generated values not updating | Forgot to run generator | Run `pnpm generate:theme` after any config change |
| Hand-edited CSS overwritten | Edited between GENERATED markers | Only edit outside the markers; token values go in the config |

### Quick contrast check

OKLCH lightness gap rules of thumb:
- **Text on surface:** minimum L gap of ~0.35 for readable body text
- **Muted text:** minimum L gap of ~0.15 for secondary text
- **Surface levels:** L gap of 0.01–0.03 for subtle elevation, 0.05+ for strong distinction
- **Borders:** L gap of ~0.06–0.10 from their surface for visibility
