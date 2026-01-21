import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  MarkdownContent,
  ScrollArea
} from '@codelobby/ui-kit'
import { AlertTriangle, Book, RotateCcw, X } from 'lucide-react'
import { useCallback, useState } from 'react'

// Features book content (from features_book.md)
const FEATURES_BOOK_CONTENT = `# CodeLobby Features Book

> **Your PR Dashboard, Reimagined**  
> Stop context-switching. Start shipping.

---

## 🎯 What is CodeLobby?

CodeLobby is a **desktop application** that brings all your Pull Requests together in one beautiful, intelligent dashboard. No more juggling browser tabs, missing review requests, or wondering why a PR is stuck.

Built for developers who care about their workflow.

---

## ✨ Core Features

### 🖼️ Two Ways to Work

**Canvas View** — Your PRs as draggable cards
- Arrange your PRs however you like
- Resize cards to show more or less detail
- Group by project, priority, or whatever makes sense to you
- Perfect for visual thinkers

**IDE View** — A familiar tree structure
- Repository → PR hierarchy
- Quick keyboard navigation
- Compact and scannable
- Feels like your favorite code editor

Switch between views anytime. Your layout is remembered.

---

### 🔍 See Everything at a Glance

Every PR shows you what matters:

| What You See | Why It Matters |
|--------------|----------------|
| **CI Status** | Know if tests pass before clicking |
| **Review State** | See who approved, who requested changes |
| **Comment Count** | Spot active discussions instantly |
| **Time Open** | Identify PRs that need attention |
| **Draft Status** | Distinguish WIP from ready-to-review |

No more clicking into each PR just to check its status.

---

### 💬 Conversations Without the Noise

PR discussions can get messy. CodeLobby helps you focus:

- **Filter by People or Bots** — Hide automated comments when you need to
- **Thread Tracking** — See which discussions are resolved
- **Review Comments** — All feedback in one place
- **Rich Formatting** — Markdown renders beautifully

Read what matters, skip what doesn't.

---

### 🔧 CI/CD at Your Fingertips

Stop hunting through GitHub Actions logs:

- **All Jobs Visible** — See every check run
- **Grouped by Status** — Failed jobs rise to the top
- **One-Click Details** — Jump to the full log when needed
- **Real-Time Updates** — Watch jobs complete without refreshing

When CI fails, you'll know exactly where to look.

---

## 🤖 AI-Powered Features

### 🐕 Your AI Assistant

A built-in AI assistant powered by Claude that understands code:

**What It Can Do:**
- Answer questions about your PRs
- Explain complex code changes
- Help draft commit messages
- Discuss debugging strategies

**How It Works:**
- Type naturally, like talking to a colleague
- See the AI's reasoning process as it thinks
- Conversation history is saved automatically
- Works offline with your stored context

Your conversations are private and stored locally.

---

### 🔗 Open Preview (AI-Powered)

Many PRs have preview/staging links buried in comments. Finding them is tedious.

**One Click:**
1. Click the globe icon on any PR
2. AI scans the description and comments
3. Preview URL opens in your browser

No more searching through bot comments for that Vercel link.

---

### ❓ "Why Is This PR Still Open?" (AI-Powered)

Stale PRs happen. Understanding why requires clicking through CI, reviews, and comments.

**Instant Analysis:**
1. Click the help icon on any PR
2. Watch the AI think through the blockers
3. Get a clear, actionable summary

**What It Analyzes:**
- CI/CD failures and what's broken
- Pending reviews and who's blocking
- Unresolved discussions
- Draft status and merge readiness

**Example Output:**
> "This PR is blocked by 2 failing CI checks (lint, tests) and has 1 unresolved review thread about error handling. Once the lint issues are fixed and the review thread is addressed, it should be ready to merge."

The analysis is saved per PR, so you don't re-analyze unnecessarily.

---

## 🎨 Designed for Developers

### Dark Mode (Obviously)

A beautiful dark theme that's easy on the eyes during late-night coding sessions. Light mode available for the brave.

### Native Desktop Experience

- **Fast** — No browser overhead
- **Keyboard Friendly** — Navigate without touching your mouse
- **System Integration** — Desktop notifications when you need them
- **Always Available** — Keep it in your dock

### Remembers Your Preferences

Everything persists across sessions:
- Window positions and sizes
- Expanded/collapsed sections
- Filter settings per repository
- AI conversation history
- Panel open/closed states

Close the app Friday, open it Monday — everything is exactly where you left it.

---

## 🔒 Privacy & Security

### Your Data Stays Yours

- **Local Storage** — All data stored on your machine
- **Encrypted Tokens** — API keys are encrypted at rest
- **No Telemetry** — We don't track you
- **Open Architecture** — See exactly what data is stored

### Minimal Permissions

CodeLobby only asks for what it needs:
- Read access to your repositories
- Read access to pull requests and comments
- That's it

---

## 📊 Rate Limit Awareness

GitHub has API limits. CodeLobby respects them:

- **Visual Gauge** — See your remaining API calls
- **Reset Timer** — Know when limits refresh
- **Smart Caching** — Data is cached for 30 minutes
- **Graceful Handling** — Clear messages when limits are reached

Never wonder why data isn't loading.

---

## 🚀 Perfect For

### Individual Developers
- Track your own PRs across multiple repos
- Never miss a review request
- Stay on top of CI failures

### Team Leads
- Monitor team's PR velocity
- Identify stuck PRs quickly
- Keep deployments moving

### Open Source Maintainers
- Manage contributions across projects
- Triage incoming PRs efficiently
- Focus on what needs attention

---

## 💡 Tips & Tricks

### Quick Wins

1. **My PRs Filter** — Toggle to see only your PRs in any repo
2. **Drag to Rearrange** — Canvas view lets you organize by priority
3. **Keyboard Navigation** — Arrow keys work in IDE view
4. **AI Memory** — Your assistant remembers previous conversations

### Power User Features

1. **Extended Thinking** — Watch AI reasoning in real-time
2. **Comment Filtering** — Hide bot noise with one click
3. **Panel Resizing** — Drag edges to customize layouts

---

## 🗺️ Roadmap Preview

We're actively building:

- **PR Actions** — Approve, merge, and comment without leaving the app
- **Jira Integration** — Link PRs to tickets automatically
- **Code Review Interface** — Review diffs inline
- **Multi-Account Support** — Work across organizations
- **Team Dashboard** — See your whole team's PRs

---

## 📝 Summary

| Feature | Benefit |
|---------|---------|
| **Unified Dashboard** | All PRs in one place |
| **Two View Modes** | Work the way you think |
| **Smart Filtering** | Focus on what matters |
| **AI Assistant** | Intelligent help on demand |
| **Open Preview** | One-click staging access |
| **Why Open Analysis** | Instant PR diagnostics |
| **Persistent State** | Pick up where you left off |
| **Dark Mode** | Easy on the eyes |
| **Local & Private** | Your data stays yours |

---

## 🎉 Get Started

1. **Add your GitHub Token** — Secure, encrypted, never leaves your machine
2. **Select Your Repos** — Choose which projects to track
3. **Start Working** — Your PRs are ready

Welcome to a better way to manage Pull Requests.

---

*CodeLobby — Because your time is too valuable for tab juggling.*
`

interface AboutDialogProps {
  trigger?: React.ReactNode
  onFactoryReset?: () => void
}

export function AboutDialog({ trigger, onFactoryReset }: AboutDialogProps) {
  const [open, setOpen] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const handleFactoryReset = useCallback(async () => {
    setIsResetting(true)
    try {
      await window.electron.factoryReset()
      setOpen(false)
      setShowResetConfirm(false)
      // Reload the app to apply the reset
      if (onFactoryReset) {
        onFactoryReset()
      } else {
        window.location.reload()
      }
    } catch (error) {
      console.error('Factory reset failed:', error)
    } finally {
      setIsResetting(false)
    }
  }, [onFactoryReset])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-8 w-8" type="button">
            <Book className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Book className="w-5 h-5 text-primary" />
              About CodeLobby
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <MarkdownContent content={FEATURES_BOOK_CONTENT} />
          </div>
        </ScrollArea>
        <div className="px-6 py-3 border-t border-border flex-shrink-0 bg-muted/30">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Version 1.0.0 • Built with ❤️ for developers
            </p>
            {!showResetConfirm ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-destructive"
                onClick={() => setShowResetConfirm(true)}
                type="button"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Factory Reset
              </Button>
            ) : (
              <div className="flex items-center gap-2 animate-in fade-in duration-200">
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <AlertTriangle className="w-3 h-3" />
                  This will erase ALL data!
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setShowResetConfirm(false)}
                  disabled={isResetting}
                  type="button"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="text-xs h-7"
                  onClick={handleFactoryReset}
                  disabled={isResetting}
                  type="button"
                >
                  {isResetting ? (
                    <>
                      <RotateCcw className="w-3 h-3 mr-1 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    'Yes, Erase Everything'
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
