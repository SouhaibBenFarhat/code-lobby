/**
 * Bootstrap - Module Registration
 *
 * This file imports all modules to trigger their self-registration.
 * This is the ONLY place where UI modules are imported.
 *
 * When a module is imported, its top-level registerToSlot() call runs,
 * adding the module to the slot registry.
 */

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZE DATA MODULE (must be first!)
// ═══════════════════════════════════════════════════════════════════════════
import { initDataModule } from '@codelobby/data-module'
initDataModule()

// ═══════════════════════════════════════════════════════════════════════════
// IMPORT UI MODULES (triggers self-registration)
// ═══════════════════════════════════════════════════════════════════════════

// Header module → registers to 'header' slot
import '@codelobby/header-module'

// Future modules (uncomment as they're created):
// import '@codelobby/explorer-module'    // → 'left-panel' slot
// import '@codelobby/canvas-module'      // → 'main' slot
// import '@codelobby/ide-view-module'    // → 'main' slot
// import '@codelobby/pr-detail-module'   // → 'right-panel' slot
// import '@codelobby/ai-chat-module'     // → 'right-panel' slot

console.log('[bootstrap] All modules registered')
