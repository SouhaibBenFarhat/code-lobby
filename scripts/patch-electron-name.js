#!/usr/bin/env node
/**
 * Patches the Electron.app's Info.plist to show "CodeLobby" in the dock
 * This only affects development mode on macOS
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

if (process.platform !== 'darwin') {
  console.log('Skipping Electron name patch (not macOS)')
  process.exit(0)
}

const electronAppPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'electron',
  'dist',
  'Electron.app'
)

const plistPath = path.join(electronAppPath, 'Contents', 'Info.plist')

if (!fs.existsSync(plistPath)) {
  console.log('Electron.app not found, skipping patch')
  process.exit(0)
}

try {
  let plist = fs.readFileSync(plistPath, 'utf8')
  
  // Replace CFBundleDisplayName
  plist = plist.replace(
    /(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/,
    '$1CodeLobby$2'
  )
  
  // Replace CFBundleName
  plist = plist.replace(
    /(<key>CFBundleName<\/key>\s*<string>)[^<]*(<\/string>)/,
    '$1CodeLobby$2'
  )
  
  fs.writeFileSync(plistPath, plist)
  
  // Touch the app bundle to invalidate caches
  execSync(`touch "${electronAppPath}"`)
  
  // Clear Launch Services cache for this app
  try {
    execSync(`/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -u "${electronAppPath}" 2>/dev/null || true`)
    execSync(`/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "${electronAppPath}" 2>/dev/null || true`)
  } catch (e) {
    // Ignore errors from lsregister
  }
  
  console.log('✅ Patched Electron.app to show "CodeLobby" in dock')
  console.log('💡 If tooltip still shows "Electron", run: killall Dock')
} catch (error) {
  console.error('Failed to patch Electron.app:', error.message)
  process.exit(1)
}
