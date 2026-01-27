export {
  CodeHighlight,
  type CodeHighlightProps,
  getLanguageFromFileName,
  highlightCode
} from './CodeHighlight'
export {
  getHljsLanguage,
  type HljsToken,
  hasInitError,
  isHighlighterReady,
  preloadHighlighter,
  tokenizeCode,
  tokenizeLine
} from './highlighter'
