/**
 * Bootstrap - Module Registration
 *
 * Phase 1: Hybrid Architecture
 * - Data module is initialized to handle actions
 * - UI modules are NOT registered to slots (App.tsx renders directly)
 * - StoreSync keeps the shared store in sync with App state
 *
 * Phase 2 (Future): Full Modular Architecture
 * - Uncomment module imports to enable slot registration
 * - Remove direct rendering from App.tsx
 * - Components read from store instead of props
 */

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZE DATA MODULE
// ═══════════════════════════════════════════════════════════════════════════
import { initDataModule } from '@codelobby/data-module'
initDataModule()

// ═══════════════════════════════════════════════════════════════════════════
// UI MODULE IMPORTS (Phase 2 - Currently Disabled)
// ═══════════════════════════════════════════════════════════════════════════
// These are disabled because App.tsx currently renders components directly.
// When we migrate to full modular architecture, uncomment these:

// import '@codelobby/header-module'     // → 'header' slot
// import '@codelobby/explorer-module'   // → 'left-panel' slot
// import '@codelobby/canvas-module'     // → 'main' slot
// import '@codelobby/pr-detail-module'  // → 'right-panel' slot
// import '@codelobby/ai-chat-module'    // → 'right-panel' slot

console.log('[bootstrap] Data module initialized (Phase 1 hybrid mode)')
