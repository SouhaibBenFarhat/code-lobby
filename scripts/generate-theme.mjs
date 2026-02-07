#!/usr/bin/env node
/**
 * OKLCH Theme Generator
 *
 * Reads theme.config.mjs and generates the CSS custom property values
 * for both light and dark modes, then injects them into globals.css
 * between marker comments.
 *
 * Usage:  node scripts/generate-theme.mjs
 *         pnpm generate:theme
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ─── Import config ───────────────────────────────────────────────────────────

const configPath = resolve(ROOT, 'src/renderer/styles/theme.config.mjs')
const { roles, lightTokens, darkTokens } = await import(configPath)

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Format a single OKLCH token value as raw channels: "L C H"
 * The CSS variable stores just the channels so Tailwind can append "/ alpha".
 *
 * @param {{ role: string, l: number, c: number }} token
 * @returns {string}  e.g. "0.968 0.005 264"
 */
function formatToken(token) {
  const hue = token.c === 0 ? 0 : roles[token.role].hue
  const l = token.l.toFixed(3)
  const c = token.c.toFixed(4)
  const h = hue.toFixed(1)
  return `${l} ${c} ${h}`
}

/**
 * Compute WCAG-approximate luminance from OKLCH lightness.
 * (OKLCH L is already perceptual, so L^2 ≈ relative luminance.)
 */
function approxLuminance(oklchL) {
  return oklchL * oklchL
}

/**
 * Approximate contrast ratio between two OKLCH lightness values.
 */
function contrastRatio(l1, l2) {
  const lum1 = approxLuminance(l1) + 0.05
  const lum2 = approxLuminance(l2) + 0.05
  return lum1 > lum2 ? lum1 / lum2 : lum2 / lum1
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validate(tokens, mode) {
  const errors = []
  const warnings = []

  // Check that every referenced role exists
  for (const [name, token] of Object.entries(tokens)) {
    if (!roles[token.role]) {
      errors.push(`[${mode}] Token "${name}" references unknown role "${token.role}"`)
    }
    if (token.l < 0 || token.l > 1) {
      errors.push(`[${mode}] Token "${name}" has lightness ${token.l} (must be 0–1)`)
    }
    if (token.c < 0 || token.c > 0.4) {
      errors.push(`[${mode}] Token "${name}" has chroma ${token.c} (must be 0–0.4)`)
    }
  }

  // Check critical contrast ratios (WCAG AA = 4.5:1)
  const fg = tokens['foreground']
  const bg = tokens['background']
  if (fg && bg) {
    const cr = contrastRatio(fg.l, bg.l)
    if (cr < 4.5) {
      errors.push(`[${mode}] foreground/background contrast ${cr.toFixed(1)}:1 < 4.5:1 (WCAG AA)`)
    }
  }

  const fgMuted = tokens['foreground-muted']
  const surface = tokens['surface']
  if (fgMuted && surface) {
    const cr = contrastRatio(fgMuted.l, surface.l)
    if (cr < 3.0) {
      warnings.push(`[${mode}] foreground-muted/surface contrast ${cr.toFixed(1)}:1 < 3.0:1`)
    }
  }

  // Verify elevation ordering
  if (mode === 'light') {
    const surfaceL = [
      ['background', bg?.l],
      ['surface', surface?.l],
      ['surface-raised', tokens['surface-raised']?.l],
      ['header', tokens['header']?.l],
    ].filter(([, l]) => l != null)

    for (let i = 1; i < surfaceL.length; i++) {
      if (surfaceL[i][1] >= surfaceL[i - 1][1]) {
        warnings.push(
          `[${mode}] Elevation: ${surfaceL[i][0]} (L=${surfaceL[i][1]}) should be darker than ${surfaceL[i - 1][0]} (L=${surfaceL[i - 1][1]})`
        )
      }
    }
  } else {
    const surfaceL = [
      ['background', bg?.l],
      ['surface', surface?.l],
      ['surface-raised', tokens['surface-raised']?.l],
      ['header', tokens['header']?.l],
    ].filter(([, l]) => l != null)

    for (let i = 1; i < surfaceL.length; i++) {
      if (surfaceL[i][1] <= surfaceL[i - 1][1]) {
        warnings.push(
          `[${mode}] Elevation: ${surfaceL[i][0]} (L=${surfaceL[i][1]}) should be lighter than ${surfaceL[i - 1][0]} (L=${surfaceL[i - 1][1]})`
        )
      }
    }
  }

  return { errors, warnings }
}

// ─── Generation ──────────────────────────────────────────────────────────────

/**
 * Map a token name to its semantic group for CSS formatting.
 * Tokens in the same group are visually grouped together.
 */
function tokenGroup(name) {
  // Surface-related tokens form one group
  if (['background', 'surface', 'surface-raised', 'header', 'surface-hover', 'overlay'].includes(name)) {
    return 'surfaces'
  }
  // Extract the prefix before any qualifier (e.g., "foreground-muted" → "foreground")
  const prefix = name.replace(/-(foreground|muted|subtle|ghost|raised|hover|active|border|bg|bubble|fg)$/, '')
  return prefix
}

function generateBlock(tokens, indent = '    ') {
  const lines = []
  let prevGroup = null

  for (const [name, token] of Object.entries(tokens)) {
    const group = tokenGroup(name)
    if (prevGroup && group !== prevGroup) {
      lines.push('')
    }
    prevGroup = group

    lines.push(`${indent}--${name}: ${formatToken(token)};`)
  }

  return lines.join('\n')
}

// ─── Run ─────────────────────────────────────────────────────────────────────

// Validate
console.log('Validating theme config...')
const lightResult = validate(lightTokens, 'light')
const darkResult = validate(darkTokens, 'dark')

const allErrors = [...lightResult.errors, ...darkResult.errors]
const allWarnings = [...lightResult.warnings, ...darkResult.warnings]

for (const w of allWarnings) console.log(`  ⚠  ${w}`)
for (const e of allErrors) console.error(`  ✗  ${e}`)

if (allErrors.length > 0) {
  console.error(`\n${allErrors.length} error(s) — aborting.`)
  process.exit(1)
}

// Generate CSS blocks
const lightCSS = generateBlock(lightTokens)
const darkCSS = generateBlock(darkTokens)

// Read globals.css
const globalsPath = resolve(ROOT, 'src/renderer/styles/globals.css')
let css = readFileSync(globalsPath, 'utf-8')

// Replace content between markers
const LIGHT_START = '/* GENERATED:LIGHT:START */'
const LIGHT_END = '/* GENERATED:LIGHT:END */'
const DARK_START = '/* GENERATED:DARK:START */'
const DARK_END = '/* GENERATED:DARK:END */'

function replaceBetweenMarkers(content, startMarker, endMarker, replacement) {
  const startIdx = content.indexOf(startMarker)
  const endIdx = content.indexOf(endMarker)

  if (startIdx === -1 || endIdx === -1) {
    console.error(`Markers not found: ${startMarker} / ${endMarker}`)
    process.exit(1)
  }

  const before = content.slice(0, startIdx + startMarker.length)
  const after = content.slice(endIdx)

  return `${before}\n${replacement}\n    ${after}`
}

css = replaceBetweenMarkers(css, LIGHT_START, LIGHT_END, lightCSS)
css = replaceBetweenMarkers(css, DARK_START, DARK_END, darkCSS)

writeFileSync(globalsPath, css, 'utf-8')

console.log(`\n✓ Generated ${Object.keys(lightTokens).length} light tokens`)
console.log(`✓ Generated ${Object.keys(darkTokens).length} dark tokens`)
console.log(`✓ Written to ${globalsPath}`)

if (allWarnings.length > 0) {
  console.log(`\n${allWarnings.length} warning(s) — review above.`)
}
