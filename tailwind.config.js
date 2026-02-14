/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/renderer/**/*.{ts,tsx,html}',
    './--module-*/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        /* Semantic surface hierarchy
         * All colors use oklch() with <alpha-value> for Tailwind opacity modifiers */
        background: "oklch(var(--background) / <alpha-value>)",
        foreground: {
          DEFAULT: "oklch(var(--foreground) / <alpha-value>)",
          muted: "oklch(var(--foreground-muted) / <alpha-value>)",
          subtle: "oklch(var(--foreground-subtle) / <alpha-value>)",
          ghost: "oklch(var(--foreground-ghost) / <alpha-value>)",
        },
        surface: {
          DEFAULT: "oklch(var(--surface) / <alpha-value>)",
          content: "oklch(var(--surface-content) / <alpha-value>)",
          raised: "oklch(var(--surface-raised) / <alpha-value>)",
          hover: "oklch(var(--surface-hover) / <alpha-value>)",
          foreground: "oklch(var(--surface-foreground) / <alpha-value>)",
        },
        overlay: "oklch(var(--overlay) / <alpha-value>)",
        code: {
          DEFAULT: "oklch(var(--code-bg) / <alpha-value>)",
          foreground: "oklch(var(--code-fg) / <alpha-value>)",
        },
        chat: {
          DEFAULT: "oklch(var(--chat-bg) / <alpha-value>)",
          bubble: "oklch(var(--chat-bubble) / <alpha-value>)",
        },
        /* Borders */
        border: {
          DEFAULT: "oklch(var(--border) / <alpha-value>)",
          muted: "oklch(var(--border-muted) / <alpha-value>)",
          subtle: "oklch(var(--border-subtle) / <alpha-value>)",
        },
        /* Interactive states */
        interactive: {
          hover: "oklch(var(--interactive-hover) / <alpha-value>)",
          active: "oklch(var(--interactive-active) / <alpha-value>)",
        },
        /* Input / ring */
        input: "oklch(var(--input) / <alpha-value>)",
        ring: "oklch(var(--ring) / <alpha-value>)",
        /* Accent / brand */
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground) / <alpha-value>)",
        },
        /* System status */
        destructive: {
          DEFAULT: "oklch(var(--destructive) / <alpha-value>)",
          foreground: "oklch(var(--destructive-foreground) / <alpha-value>)",
          subtle: "oklch(var(--destructive-subtle) / <alpha-value>)",
          border: "oklch(var(--destructive-border) / <alpha-value>)",
        },
        success: {
          DEFAULT: "oklch(var(--success) / <alpha-value>)",
          foreground: "oklch(var(--success-foreground) / <alpha-value>)",
          subtle: "oklch(var(--success-subtle) / <alpha-value>)",
          border: "oklch(var(--success-border) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "oklch(var(--warning) / <alpha-value>)",
          foreground: "oklch(var(--warning-foreground) / <alpha-value>)",
          subtle: "oklch(var(--warning-subtle) / <alpha-value>)",
          border: "oklch(var(--warning-border) / <alpha-value>)",
        },
        info: {
          DEFAULT: "oklch(var(--info) / <alpha-value>)",
          subtle: "oklch(var(--info-subtle) / <alpha-value>)",
          border: "oklch(var(--info-border) / <alpha-value>)",
        },
        /* Backward-compatible aliases (map to new tokens) */
        secondary: {
          DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
          foreground: "oklch(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "oklch(var(--muted) / <alpha-value>)",
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          foreground: "oklch(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "oklch(var(--popover) / <alpha-value>)",
          foreground: "oklch(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "oklch(var(--card) / <alpha-value>)",
          foreground: "oklch(var(--card-foreground) / <alpha-value>)",
        },
      },
      borderRadius: {
        none: '0',
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        DEFAULT: 'var(--radius)',
        md: 'var(--radius)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'calc(var(--radius-xl) * 1.5)',
        full: '9999px',
      },
      boxShadow: {
        /* Elevation-aware shadows (use CSS variables so light/dark differ) */
        'elevation-low': 'var(--shadow-elevation-low)',
        'elevation-medium': 'var(--shadow-elevation-medium)',
        'elevation-high': 'var(--shadow-elevation-high)',
        /* Apple-style shadows (static, for decorative use) */
        'apple-sm': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'apple': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'apple-md': '0 4px 16px rgba(0, 0, 0, 0.12)',
        'apple-lg': '0 8px 32px rgba(0, 0, 0, 0.16)',
        'apple-xl': '0 16px 64px rgba(0, 0, 0, 0.2)',
      },
      transitionTimingFunction: {
        DEFAULT: 'var(--ease)',
        theme: 'var(--ease)',
        bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        DEFAULT: 'var(--duration-fast)',
        fast: 'var(--duration-fast)',
        normal: 'var(--duration)',
        slow: 'var(--duration-slow)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "slide-in": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        // Sheet/Drawer slide animations
        "slide-in-from-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-out-to-right": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(100%)" },
        },
        "slide-in-from-left": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-out-to-left": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-100%)" },
        },
        "slide-in-from-top": {
          from: { transform: "translateY(-100%)" },
          to: { transform: "translateY(0)" },
        },
        "slide-out-to-top": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(-100%)" },
        },
        "slide-in-from-bottom": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "slide-out-to-bottom": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(100%)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "progress-indeterminate": {
          "0%, 100%": { transform: "translateX(-100%)" },
          "50%": { transform: "translateX(250%)" },
        },
        "skeleton": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.65" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "slide-in": "slide-in 0.3s ease-out",
        // Sheet/Drawer animations
        "slide-in-from-right": "slide-in-from-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-out-to-right": "slide-out-to-right 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-from-left": "slide-in-from-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-out-to-left": "slide-out-to-left 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-from-top": "slide-in-from-top 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-out-to-top": "slide-out-to-top 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-from-bottom": "slide-in-from-bottom 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-out-to-bottom": "slide-out-to-bottom 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.15s ease-in",
        "progress-indeterminate": "progress-indeterminate 2s ease-in-out infinite",
        "skeleton": "skeleton 2.5s ease-in-out infinite",
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'SF Pro Text',
          'Helvetica Neue',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'SF Mono',
          'Monaco',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
}
