/// <reference path="./src/preload/electron-api.d.ts" />

// Test that all methods exist on window.electron
declare const window: Window
console.log(window.electron.getSelectedModel)
console.log(window.electron.logFromRenderer)
console.log(window.electron.fetchClaudeModels)
