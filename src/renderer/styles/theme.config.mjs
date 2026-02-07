/**
 * OKLCH Tonal Palette — Single Source of Truth
 *
 * Every semantic color token in the app is derived from this file.
 * Run `pnpm generate:theme` to regenerate globals.css variables.
 *
 * OKLCH primer:
 *   L  = perceptual lightness  (0 = black, 1 = white)
 *   C  = chroma / saturation   (0 = gray, ~0.37 = max vivid)
 *   H  = hue angle in degrees  (0–360)
 *
 * Hue reference (OKLCH):
 *   Red ≈ 27 · Orange ≈ 60 · Amber ≈ 80 · Green ≈ 155
 *   Cyan ≈ 195 · Blue ≈ 250 · Purple ≈ 305 · Pink ≈ 350
 */

// ─── Base palette roles ──────────────────────────────────────────────────────
// Change a hue here and every token using that role updates automatically.

export const roles = {
  neutral:     { hue: 264 },   // Cool blue-gray
  primary:     { hue: 250 },   // Brand blue
  destructive: { hue: 27  },   // Red
  success:     { hue: 155 },   // Green
  warning:     { hue: 80  },   // Amber
  info:        { hue: 250 },   // Blue (shared with primary)
}

// ─── Token definitions ───────────────────────────────────────────────────────
// Each token: { role, l (lightness), c (chroma) }
// Chroma = 0 means achromatic (pure gray/white/black).
// The hue comes from the role above.

export const lightTokens = {
  // Surfaces — elevation hierarchy (higher = darker in light mode)
  // Wider gaps between levels for clearer section separation
  'background':        { role: 'neutral', l: 1.000, c: 0     },   // content canvas (lightest)
  'surface-content':   { role: 'neutral', l: 0.978, c: 0.004 },   // content-zone headers (PR header)
  'surface':           { role: 'neutral', l: 0.958, c: 0.006 },   // panels, sidebars (chrome)
  'surface-raised':    { role: 'neutral', l: 0.944, c: 0.007 },   // chrome-zone headers (Explorer, AI Chat)
  'header':            { role: 'neutral', l: 0.850, c: 0.015 },   // app header bar (highest chrome)
  'surface-hover':     { role: 'neutral', l: 0.930, c: 0.007 },   // hover feedback
  'overlay':           { role: 'neutral', l: 1.000, c: 0     },

  // Text — four-level hierarchy
  'foreground':        { role: 'neutral', l: 0.175, c: 0.010 },
  'foreground-muted':  { role: 'neutral', l: 0.470, c: 0.008 },
  'foreground-subtle': { role: 'neutral', l: 0.620, c: 0.006 },
  'foreground-ghost':  { role: 'neutral', l: 0.750, c: 0.005 },

  // Borders — three-level hierarchy
  // Significantly darker than surfaces for visible section breaks
  'border':            { role: 'neutral', l: 0.860, c: 0.010 },
  'border-muted':      { role: 'neutral', l: 0.900, c: 0.008 },
  'border-subtle':     { role: 'neutral', l: 0.935, c: 0.006 },

  // Interactive states
  'interactive-hover':  { role: 'neutral', l: 0.920, c: 0.007 },
  'interactive-active': { role: 'neutral', l: 0.890, c: 0.009 },

  // Primary / brand
  'primary':            { role: 'primary', l: 0.590, c: 0.190 },
  'primary-foreground': { role: 'neutral', l: 1.000, c: 0     },

  // Destructive
  'destructive':            { role: 'destructive', l: 0.550, c: 0.200 },
  'destructive-foreground': { role: 'neutral',     l: 1.000, c: 0     },
  'destructive-subtle':     { role: 'destructive', l: 0.960, c: 0.020 },
  'destructive-border':     { role: 'destructive', l: 0.895, c: 0.035 },

  // Success
  'success':            { role: 'success', l: 0.620, c: 0.170 },
  'success-foreground': { role: 'neutral', l: 1.000, c: 0     },
  'success-subtle':     { role: 'success', l: 0.960, c: 0.020 },
  'success-border':     { role: 'success', l: 0.880, c: 0.035 },

  // Warning
  'warning':            { role: 'warning', l: 0.800, c: 0.160 },
  'warning-foreground': { role: 'neutral', l: 0.175, c: 0.010 },
  'warning-subtle':     { role: 'warning', l: 0.960, c: 0.025 },
  'warning-border':     { role: 'warning', l: 0.880, c: 0.045 },

  // Info
  'info':        { role: 'info', l: 0.625, c: 0.150 },
  'info-subtle': { role: 'info', l: 0.960, c: 0.020 },
  'info-border': { role: 'info', l: 0.895, c: 0.035 },

  // Input / ring
  'input': { role: 'neutral', l: 0.910, c: 0.007 },
  'ring':  { role: 'primary', l: 0.590, c: 0.190 },

  // Chat
  'chat-bg':     { role: 'neutral', l: 0.930, c: 0.006 },
  'chat-bubble': { role: 'neutral', l: 1.000, c: 0     },

  // Code
  'code-bg': { role: 'neutral', l: 0.958, c: 0.008 },
  'code-fg': { role: 'neutral', l: 0.270, c: 0.010 },
}

export const darkTokens = {
  // Surfaces — elevation hierarchy (higher = lighter in dark mode)
  'background':        { role: 'neutral', l: 0.145, c: 0.012 },   // content canvas (darkest)
  'surface-content':   { role: 'neutral', l: 0.160, c: 0.012 },   // content-zone headers
  'surface':           { role: 'neutral', l: 0.185, c: 0.011 },   // panels, sidebars (chrome)
  'surface-raised':    { role: 'neutral', l: 0.202, c: 0.010 },   // chrome-zone headers
  'header':            { role: 'neutral', l: 0.310, c: 0.014 },   // app header bar (highest chrome)
  'surface-hover':     { role: 'neutral', l: 0.222, c: 0.010 },   // hover feedback
  'overlay':           { role: 'neutral', l: 0.275, c: 0.010 },

  // Text
  'foreground':        { role: 'neutral', l: 0.960, c: 0     },
  'foreground-muted':  { role: 'neutral', l: 0.625, c: 0.006 },
  'foreground-subtle': { role: 'neutral', l: 0.490, c: 0.006 },
  'foreground-ghost':  { role: 'neutral', l: 0.365, c: 0.005 },

  // Borders
  'border':            { role: 'neutral', l: 0.290, c: 0.008 },
  'border-muted':      { role: 'neutral', l: 0.250, c: 0.008 },
  'border-subtle':     { role: 'neutral', l: 0.210, c: 0.007 },

  // Interactive states
  'interactive-hover':  { role: 'neutral', l: 0.240, c: 0.010 },
  'interactive-active': { role: 'neutral', l: 0.275, c: 0.010 },

  // Primary / brand  (same in both modes for brand consistency)
  'primary':            { role: 'primary', l: 0.590, c: 0.190 },
  'primary-foreground': { role: 'neutral', l: 1.000, c: 0     },

  // Destructive  (slightly brighter + less chroma in dark to avoid neon)
  'destructive':            { role: 'destructive', l: 0.635, c: 0.195 },
  'destructive-foreground': { role: 'neutral',     l: 1.000, c: 0     },
  'destructive-subtle':     { role: 'destructive', l: 0.215, c: 0.030 },
  'destructive-border':     { role: 'destructive', l: 0.305, c: 0.035 },

  // Success
  'success':            { role: 'success', l: 0.620, c: 0.155 },
  'success-foreground': { role: 'neutral', l: 1.000, c: 0     },
  'success-subtle':     { role: 'success', l: 0.215, c: 0.025 },
  'success-border':     { role: 'success', l: 0.290, c: 0.028 },

  // Warning
  'warning':            { role: 'warning', l: 0.800, c: 0.145 },
  'warning-foreground': { role: 'neutral', l: 0.175, c: 0.010 },
  'warning-subtle':     { role: 'warning', l: 0.215, c: 0.025 },
  'warning-border':     { role: 'warning', l: 0.290, c: 0.028 },

  // Info
  'info':        { role: 'info', l: 0.625, c: 0.140 },
  'info-subtle': { role: 'info', l: 0.220, c: 0.025 },
  'info-border': { role: 'info', l: 0.305, c: 0.028 },

  // Input / ring
  'input': { role: 'neutral', l: 0.262, c: 0.008 },
  'ring':  { role: 'primary', l: 0.590, c: 0.190 },

  // Chat
  'chat-bg':     { role: 'neutral', l: 0.110, c: 0.010 },
  'chat-bubble': { role: 'neutral', l: 0.200, c: 0.010 },

  // Code
  'code-bg': { role: 'neutral', l: 0.145, c: 0.012 },
  'code-fg': { role: 'neutral', l: 0.890, c: 0.005 },
}
