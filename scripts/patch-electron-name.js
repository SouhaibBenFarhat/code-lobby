#!/usr/bin/env node
/**
 * Patches the Electron.app's Info.plist to show "CodeLobby" in the dock
 * This only affects development mode on macOS
 */

const fs = require('fs')
const path = require('path')

if (process.platform !== 'darwin') {
  console.log('Skipping Electron name patch (not macOS)')
  process.exit(0)
}

const electronPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'electron',
  'dist',
  'Electron.app',
  'Contents',
  'Info.plist'
)

if (!fs.existsSync(electronPath)) {
  console.log('Electron.app not found, skipping patch')
  process.exit(0)
}

try {
  let plist = fs.readFileSync(electronPath, 'utf8')
  
  // Replace CFBundleDisplayName
  plist = plist.replace(
    /<key>CFBundleDisplayName<\/key>\s*<string>[^<]*<\/string>/,
    '<key>CFBundleDisplayName</key>\n\t<string>CodeLobby</string>'
  )
  
  // Replace CFBundleName
  plist = plist.replace(
    /<key>CFBundleName<\/key>\s*<string>[^<]*<\/string>/,
    '<key>CFBundleName</key>\n\t<string>CodeLobby</string>'
  )
  
  fs.writeFileSync(electronPath, plist)
  console.log('✅ Patched Electron.app to show "CodeLobby" in dock')
} catch (error) {
  console.error('Failed to patch Electron.app:', error.message)
  process.exit(1)
}
