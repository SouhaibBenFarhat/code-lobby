import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Trash2, Key, Loader2, Bot, User, AlertCircle, Settings, X, ChevronDown, RefreshCw } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { cn } from '@/lib/utils'
import { MarkdownContent } from './MarkdownContent'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ClaudeModel {
  id: string
  display_name: string
  created_at: string
}

interface AIChatPanelProps {
  onClose: () => void
}

export function AIChatPanel({ onClose }: AIChatPanelProps) {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [isSettingKey, setIsSettingKey] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [models, setModels] = useState<ClaudeModel[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load API key and chat history on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [key, history, model] = await Promise.all([
        window.electron.getClaudeApiKey(),
        window.electron.getChatHistory(),
        window.electron.getSelectedModel()
      ])
      setApiKey(key)
      setMessages(history)
      setSelectedModel(model)
      
      // If we have an API key, fetch available models
      if (key) {
        loadModels()
      }
    } catch (e) {
      console.error('Failed to load AI chat data:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const loadModels = async () => {
    setIsLoadingModels(true)
    try {
      const result = await window.electron.fetchClaudeModels()
      if (result.success && result.models) {
        setModels(result.models)
        window.electron.logFromRenderer('info', 'API', 'Claude models loaded', { 
          count: result.models.length 
        })
      } else {
        window.electron.logFromRenderer('error', 'API', 'Failed to load Claude models', { 
          error: result.error 
        })
      }
    } catch (e) {
      console.error('Failed to load models:', e)
    } finally {
      setIsLoadingModels(false)
    }
  }

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId)
    await window.electron.setSelectedModel(modelId)
    window.electron.logFromRenderer('info', 'API', 'Model changed', { model: modelId })
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Focus input when ready
  useEffect(() => {
    if (!isLoading && apiKey && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isLoading, apiKey])

  const handleSetApiKey = async () => {
    // Log immediately when button is clicked
    console.log('[AIChat] handleSetApiKey called, apiKeyInput:', apiKeyInput ? `${apiKeyInput.length} chars` : 'empty')
    window.electron.logFromRenderer('info', 'AUTH', 'API key button clicked', { 
      hasInput: !!apiKeyInput,
      inputLength: apiKeyInput?.length || 0 
    })
    
    if (!apiKeyInput.trim()) {
      console.log('[AIChat] Empty input, returning')
      window.electron.logFromRenderer('warn', 'AUTH', 'Empty API key input, ignoring')
      return
    }
    
    const keyToSet = apiKeyInput.trim()
    console.log('[AIChat] Setting key, length:', keyToSet.length, 'prefix:', keyToSet.substring(0, 10))
    
    await window.electron.logFromRenderer('info', 'AUTH', 'Setting Claude API key from UI', {
      keyLength: keyToSet.length,
      keyPrefix: keyToSet.substring(0, 10) + '...'
    })
    
    setIsSettingKey(true)
    setError(null)
    
    try {
      console.log('[AIChat] Calling IPC setClaudeApiKey...')
      await window.electron.logFromRenderer('info', 'AUTH', 'Calling setClaudeApiKey IPC...')
      const result = await window.electron.setClaudeApiKey(keyToSet)
      
      console.log('[AIChat] IPC result:', result)
      await window.electron.logFromRenderer('info', 'AUTH', 'setClaudeApiKey IPC result', { result })
      
      if (result.success) {
        console.log('[AIChat] Success!')
        await window.electron.logFromRenderer('info', 'AUTH', 'API key set successfully')
        setApiKey(keyToSet)
        setApiKeyInput('')
        // Load available models and get default
        const [defaultModel] = await Promise.all([
          window.electron.getSelectedModel(),
        ])
        setSelectedModel(defaultModel)
        loadModels()
      } else {
        console.log('[AIChat] Failed:', result.error)
        await window.electron.logFromRenderer('error', 'AUTH', 'API key set failed', { error: result.error })
        setError(result.error || 'Invalid API key')
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      const stack = e instanceof Error ? e.stack : undefined
      console.error('[AIChat] Exception:', errorMsg, e)
      await window.electron.logFromRenderer('error', 'AUTH', 'Exception setting API key', { 
        error: errorMsg, 
        stack 
      })
      setError(`Failed to set API key: ${errorMsg}`)
    } finally {
      setIsSettingKey(false)
    }
  }

  const handleRemoveApiKey = async () => {
    await window.electron.setClaudeApiKey(null)
    setApiKey(null)
    setShowSettings(false)
    setMessages([])
  }

  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || isSending) return
    
    const userMessage = input.trim()
    setInput('')
    setIsSending(true)
    setError(null)
    
    // Optimistically add user message to UI
    const tempUserMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempUserMsg])
    
    try {
      const result = await window.electron.sendChatMessage(userMessage)
      if (result.success && result.message) {
        // Reload full history to ensure consistency
        const history = await window.electron.getChatHistory()
        setMessages(history)
      } else {
        setError(result.error || 'Failed to send message')
        // Remove the optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id))
      }
    } catch (e) {
      setError('Failed to communicate with Claude')
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id))
    } finally {
      setIsSending(false)
    }
  }, [input, isSending])

  const handleClearHistory = async () => {
    await window.electron.clearChatHistory()
    setMessages([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Chat interface (unified - handles both API key setup and chat)
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-sm">AI Assistant</h2>
          {apiKey && selectedModel && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
              ({models.find(m => m.id === selectedModel)?.display_name || selectedModel.split('-').slice(0, 2).join(' ')})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {apiKey && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowSettings(!showSettings)}
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleClearHistory}
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && apiKey && (
        <div className="p-3 border-b border-border bg-muted/30 space-y-3">
          {/* Model Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Model</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={loadModels}
                disabled={isLoadingModels}
                title="Refresh models"
              >
                <RefreshCw className={cn("w-3 h-3", isLoadingModels && "animate-spin")} />
              </Button>
            </div>
            {models.length > 0 ? (
              <Select value={selectedModel} onValueChange={handleModelChange}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.id} className="text-xs">
                      <div className="flex flex-col">
                        <span>{model.display_name}</span>
                        <span className="text-[10px] text-muted-foreground">{model.id}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {isLoadingModels ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Loading models...</span>
                  </>
                ) : (
                  <>
                    <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{selectedModel}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 text-[10px] px-1"
                      onClick={loadModels}
                    >
                      Load models
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* API Key */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">API Key configured</span>
            <Button
              variant="destructive"
              size="sm"
              className="h-6 text-xs"
              onClick={handleRemoveApiKey}
            >
              Remove Key
            </Button>
          </div>
        </div>
      )}

      {/* Messages area */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        {isLoading ? (
          <div className="h-full flex items-center justify-center min-h-[200px]">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center min-h-[200px]">
            <div className="text-center space-y-2">
              <Bot className="w-10 h-10 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {apiKey ? 'Start a conversation with Claude' : 'Enter your API key below to start'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2",
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                      <MarkdownContent content={message.content} />
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
                
                {message.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}
            
            {isSending && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Error display */}
      {error && (
        <div className="px-3 py-2 bg-destructive/10 border-t border-destructive/20">
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        </div>
      )}

      {/* Input area - shows API key input or message input */}
      <div className="p-3 border-t border-border">
        {!apiKey ? (
          // API Key input
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="Enter Claude API key (sk-ant-...)"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSetApiKey()}
                className="flex-1 h-9 text-sm"
                autoFocus
              />
              <Button
                onClick={handleSetApiKey}
                disabled={isSettingKey || !apiKeyInput.trim()}
                size="icon"
                className="h-9 w-9"
              >
                {isSettingKey ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Key className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Get your key from{' '}
              <a 
                href="https://console.anthropic.com/settings/keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                console.anthropic.com
              </a>
            </p>
          </div>
        ) : (
          // Message input
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSending}
              className="flex-1 h-9 text-sm"
            />
            <Button
              onClick={handleSendMessage}
              disabled={isSending || !input.trim()}
              size="icon"
              className="h-9 w-9"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
