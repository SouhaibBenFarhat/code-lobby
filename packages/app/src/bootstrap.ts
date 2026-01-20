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

// Explorer module → registers to 'left-panel' slot (visible in IDE mode)
import '@codelobby/explorer-module'

// Canvas module → registers to 'main' slot (visible in Canvas mode)
import '@codelobby/canvas-module'

// PR Detail module → registers to 'right-panel' slot (visible when PR selected)
import '@codelobby/pr-detail-module'

// AI Chat module → registers to 'right-panel' slot (visible when AI panel open)
import '@codelobby/ai-chat-module'

console.log('[bootstrap] All modules registered')
