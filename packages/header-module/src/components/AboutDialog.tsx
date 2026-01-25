import { useFactoryReset } from '@codelobby/data'
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
import { AlertTriangle, Book, RotateCcw } from 'lucide-react'
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

*CodeLobby — Because your time is too valuable for tab juggling.*
`

interface AboutDialogProps {
  trigger?: React.ReactNode
  onFactoryReset?: () => void
}

export function AboutDialog({ trigger, onFactoryReset }: AboutDialogProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const factoryReset = useFactoryReset()

  const handleFactoryReset = useCallback(async () => {
    factoryReset.mutate(undefined, {
      onSuccess: () => {
        setOpen(false)
        setShowResetConfirm(false)
        if (onFactoryReset) {
          onFactoryReset()
        } else {
          window.location.reload()
        }
      }
    })
  }, [factoryReset, onFactoryReset])

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
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Book className="w-5 h-5 text-primary" />
            About CodeLobby
          </DialogTitle>
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
                  disabled={factoryReset.isPending}
                  type="button"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="text-xs h-7"
                  onClick={handleFactoryReset}
                  disabled={factoryReset.isPending}
                  type="button"
                >
                  {factoryReset.isPending ? (
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
