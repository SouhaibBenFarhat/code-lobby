import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Trash2, Key, Loader2, Bot, User, AlertCircle, X, Settings } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { cn } from '@/lib/utils'
import { MarkdownContent } from './MarkdownContent'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface AIChatProps {
  isOpen: boolean
  onClose: () => void
}

export function AIChat({ isOpen, onClose }: AIChatProps) {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [isSettingKey, setIsSettingKey] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load API key and chat history on mount
  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  const loadData = async () => {
    try {
      const [key, history] = await Promise.all([
        window.electron.getClaudeApiKey(),
        window.electron.getChatHistory()
      ])
      setApiKey(key)
      setMessages(history)
    } catch (e) {
      console.error('Failed to load AI chat data:', e)
    }
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && apiKey && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, apiKey])

  const handleSetApiKey = async () => {
    if (!apiKeyInput.trim()) return
    
    setIsSettingKey(true)
    setError(null)
    
    try {
      const result = await window.electron.setClaudeApiKey(apiKeyInput.trim())
      if (result.success) {
        setApiKey(apiKeyInput.trim())
        setApiKeyInput('')
        setShowSettings(false)
      } else {
        setError(result.error || 'Invalid API key')
      }
    } catch (e) {
      setError('Failed to set API key')
    } finally {
      setIsSettingKey(false)
    }
  }

  const handleRemoveApiKey = async () => {
    await window.electron.setClaudeApiKey(null)
    setApiKey(null)
    setShowSettings(false)
  }

  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return
    
    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)
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
      setIsLoading(false)
    }
  }, [input, isLoading])

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl h-[600px] bg-background border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border bg-card/50">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">AI Assistant</h2>
            <span className="text-xs text-muted-foreground">(Claude)</span>
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
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && apiKey && (
          <div className="p-3 border-b border-border bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">API Key configured</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveApiKey}
              >
                Remove Key
              </Button>
            </div>
          </div>
        )}

        {/* Content */}
        {!apiKey ? (
          // API Key Input
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-sm space-y-4">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Key className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold">Configure Claude API Key</h3>
                <p className="text-sm text-muted-foreground">
                  Enter your Anthropic API key to start chatting with Claude.
                </p>
              </div>
              
              <div className="space-y-3">
                <Input
                  type="password"
                  placeholder="sk-ant-..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSetApiKey()}
                />
                
                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
                
                <Button 
                  className="w-full" 
                  onClick={handleSetApiKey}
                  disabled={isSettingKey || !apiKeyInput.trim()}
                >
                  {isSettingKey ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    'Save API Key'
                  )}
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  Get your API key from{' '}
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
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <Bot className="w-12 h-12 mx-auto text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      Start a conversation with Claude
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3",
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-3 py-2",
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        {message.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <MarkdownContent content={message.content} />
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>
                      
                      {message.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-primary" />
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
              <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20">
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-border bg-card/30">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder="Type a message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !input.trim()}
                  size="icon"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
