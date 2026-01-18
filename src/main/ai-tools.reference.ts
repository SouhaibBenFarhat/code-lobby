/**
 * AI Tools Reference
 * 
 * ⚠️ THIS FILE IS A REFERENCE ONLY - NOT CURRENTLY USED
 * 
 * This file contains tool definitions and executor stubs for enabling
 * Claude to execute actions on behalf of the user. These tools follow
 * the Anthropic tool use protocol (JSON Schema format).
 * 
 * When ready to implement:
 * 1. Rename to ai-tools.ts
 * 2. Implement the executor functions
 * 3. Add IPC handlers in index.ts
 * 4. Update claude-api.ts to send tools with messages
 * 5. Build confirmation UI in renderer
 * 
 * @see https://docs.anthropic.com/en/docs/build-with-claude/tool-use
 */

import type { SimpleGit } from 'simple-git'

// ============================================
// TYPES
// ============================================

export interface ToolDefinition {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, {
      type: string
      description?: string
      enum?: string[]
      items?: { type: string }
    }>
    required?: string[]
  }
}

export interface ToolResult {
  success: boolean
  result?: string
  error?: string
  cancelled?: boolean
}

export interface ToolExecutionContext {
  githubToken: string
  jiraConfig?: {
    domain: string
    email: string
    token: string
  }
}

// ============================================
// TOOL DEFINITIONS (Send to Claude API)
// ============================================

export const CODELOBBY_TOOLS: ToolDefinition[] = [

  // ==========================================
  // 1. GIT OPERATIONS
  // ==========================================
  {
    name: "git",
    description: `Git version control operations:
      - clone: Clone a repository
      - pull: Pull latest changes
      - push: Push commits to remote
      - checkout: Switch branches or restore files
      - branch: List, create, or delete branches
      - commit: Commit staged changes
      - status: Show working tree status
      - diff: Show changes between commits
      - log: Show commit history
      - stash: Stash changes temporarily
      - merge: Merge branches
      - rebase: Rebase commits
      - reset: Reset to a specific commit
      - cherry-pick: Apply specific commits
      - tag: Create or list tags
      - fetch: Download objects from remote
      - remote: Manage remotes`,
    input_schema: {
      type: "object",
      properties: {
        command: { 
          type: "string", 
          description: "Git command with arguments (without 'git' prefix). E.g., 'pull origin main', 'checkout -b feature/new'" 
        },
        cwd: { 
          type: "string", 
          description: "Repository path" 
        }
      },
      required: ["command", "cwd"]
    }
  },

  // ==========================================
  // 2. FILE SYSTEM OPERATIONS
  // ==========================================
  {
    name: "file",
    description: `File system operations:
      - read: Read file contents
      - write: Create or overwrite a file
      - append: Append to a file
      - delete: Delete a file
      - rename: Rename or move a file
      - copy: Copy a file
      - exists: Check if file exists
      - mkdir: Create directory
      - rmdir: Remove directory
      - list: List directory contents`,
    input_schema: {
      type: "object",
      properties: {
        operation: { 
          type: "string", 
          enum: ["read", "write", "append", "delete", "rename", "copy", "exists", "mkdir", "rmdir", "list"]
        },
        path: { type: "string", description: "File or directory path" },
        content: { type: "string", description: "Content for write/append operations" },
        destination: { type: "string", description: "Destination path for rename/copy" },
        recursive: { type: "boolean", description: "Recursive operation for directories" }
      },
      required: ["operation", "path"]
    }
  },

  // ==========================================
  // 3. SHELL / TERMINAL
  // ==========================================
  {
    name: "shell",
    description: `Execute shell commands. Use for:
      - Running scripts
      - Package manager commands (npm, yarn, pnpm)
      - Build commands
      - Any CLI tool`,
    input_schema: {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command to execute" },
        cwd: { type: "string", description: "Working directory" },
        timeout: { type: "integer", description: "Timeout in seconds (default: 60)" },
        background: { type: "boolean", description: "Run in background (for servers)" }
      },
      required: ["command"]
    }
  },

  // ==========================================
  // 4. GITHUB / GIT PROVIDER
  // ==========================================
  {
    name: "github",
    description: `GitHub operations on Pull Requests:
      - approve: Approve a PR
      - request_changes: Request changes on a PR
      - comment: Add a comment to a PR
      - merge: Merge a PR (merge/squash/rebase)
      - close: Close a PR without merging
      - reopen: Reopen a closed PR
      - add_label: Add labels to a PR
      - remove_label: Remove labels from a PR
      - request_review: Request review from users
      - add_assignee: Assign users to PR
      - create_pr: Create a new PR
      - get_pr: Get PR details
      - list_prs: List PRs in a repo`,
    input_schema: {
      type: "object",
      properties: {
        action: { 
          type: "string",
          enum: [
            "approve", "request_changes", "comment", "merge", "close", "reopen",
            "add_label", "remove_label", "request_review", "add_assignee",
            "create_pr", "get_pr", "list_prs"
          ]
        },
        repo: { type: "string", description: "Repository in owner/repo format" },
        pr_number: { type: "integer", description: "PR number" },
        body: { type: "string", description: "Comment/review body or PR description" },
        title: { type: "string", description: "PR title (for create_pr)" },
        head: { type: "string", description: "Source branch (for create_pr)" },
        base: { type: "string", description: "Target branch (for create_pr)" },
        merge_method: { type: "string", enum: ["merge", "squash", "rebase"] },
        labels: { type: "array", items: { type: "string" }, description: "Label names" },
        reviewers: { type: "array", items: { type: "string" }, description: "GitHub usernames" },
        assignees: { type: "array", items: { type: "string" }, description: "GitHub usernames" }
      },
      required: ["action", "repo"]
    }
  },

  // ==========================================
  // 5. PACKAGE MANAGEMENT
  // ==========================================
  {
    name: "package",
    description: `Package manager operations (npm, yarn, pnpm):
      - install: Install dependencies
      - add: Add a new package
      - remove: Remove a package
      - update: Update packages
      - run: Run a script from package.json
      - list: List installed packages
      - outdated: Check for outdated packages
      - audit: Security audit
      - init: Initialize new project`,
    input_schema: {
      type: "object",
      properties: {
        manager: { type: "string", enum: ["npm", "yarn", "pnpm"], description: "Package manager (default: npm)" },
        action: { 
          type: "string", 
          enum: ["install", "add", "remove", "update", "run", "list", "outdated", "audit", "init"]
        },
        packages: { type: "array", items: { type: "string" }, description: "Package names" },
        script: { type: "string", description: "Script name to run" },
        dev: { type: "boolean", description: "Install as dev dependency" },
        cwd: { type: "string", description: "Project directory" }
      },
      required: ["action", "cwd"]
    }
  },

  // ==========================================
  // 6. SEARCH / FIND
  // ==========================================
  {
    name: "search",
    description: `Search in files and directories:
      - grep: Search for pattern in files
      - find_files: Find files by name pattern
      - find_in_file: Search within a specific file
      - replace: Find and replace in files`,
    input_schema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["grep", "find_files", "find_in_file", "replace"] },
        pattern: { type: "string", description: "Search pattern (regex supported)" },
        path: { type: "string", description: "Directory or file to search in" },
        replacement: { type: "string", description: "Replacement text (for replace action)" },
        file_pattern: { type: "string", description: "File name pattern (e.g., *.ts)" },
        case_sensitive: { type: "boolean", description: "Case sensitive search" },
        recursive: { type: "boolean", description: "Search recursively in subdirectories" }
      },
      required: ["action", "pattern", "path"]
    }
  },

  // ==========================================
  // 7. CODE ANALYSIS
  // ==========================================
  {
    name: "analyze",
    description: `Code analysis and quality:
      - lint: Run linter (ESLint, etc.)
      - format: Format code (Prettier, etc.)
      - typecheck: Run TypeScript type checking
      - complexity: Analyze code complexity
      - dependencies: Analyze dependencies`,
    input_schema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["lint", "format", "typecheck", "complexity", "dependencies"] },
        path: { type: "string", description: "File or directory to analyze" },
        fix: { type: "boolean", description: "Auto-fix issues where possible" },
        cwd: { type: "string", description: "Project directory" }
      },
      required: ["action", "cwd"]
    }
  },

  // ==========================================
  // 8. TESTING
  // ==========================================
  {
    name: "test",
    description: `Run tests:
      - run: Run all tests
      - run_file: Run tests in a specific file
      - run_pattern: Run tests matching a pattern
      - watch: Run tests in watch mode
      - coverage: Run tests with coverage report`,
    input_schema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["run", "run_file", "run_pattern", "watch", "coverage"] },
        file: { type: "string", description: "Test file to run" },
        pattern: { type: "string", description: "Test name pattern to match" },
        cwd: { type: "string", description: "Project directory" },
        framework: { type: "string", enum: ["jest", "vitest", "mocha", "auto"], description: "Test framework" }
      },
      required: ["action", "cwd"]
    }
  },

  // ==========================================
  // 9. DOCKER
  // ==========================================
  {
    name: "docker",
    description: `Docker operations:
      - build: Build an image
      - run: Run a container
      - stop: Stop a container
      - rm: Remove a container
      - logs: View container logs
      - exec: Execute command in container
      - ps: List containers
      - images: List images
      - compose_up: Start docker-compose services
      - compose_down: Stop docker-compose services`,
    input_schema: {
      type: "object",
      properties: {
        action: { 
          type: "string", 
          enum: ["build", "run", "stop", "rm", "logs", "exec", "ps", "images", "compose_up", "compose_down"]
        },
        image: { type: "string", description: "Image name" },
        container: { type: "string", description: "Container name or ID" },
        command: { type: "string", description: "Command to execute (for exec)" },
        dockerfile: { type: "string", description: "Dockerfile path" },
        compose_file: { type: "string", description: "docker-compose.yml path" },
        ports: { type: "array", items: { type: "string" }, description: "Port mappings (e.g., 3000:3000)" },
        env: { type: "object", description: "Environment variables" },
        cwd: { type: "string", description: "Working directory" }
      },
      required: ["action"]
    }
  },

  // ==========================================
  // 10. HTTP / API TESTING
  // ==========================================
  {
    name: "http",
    description: `Make HTTP requests for API testing:
      - get: GET request
      - post: POST request
      - put: PUT request
      - patch: PATCH request
      - delete: DELETE request`,
    input_schema: {
      type: "object",
      properties: {
        method: { type: "string", enum: ["get", "post", "put", "patch", "delete"] },
        url: { type: "string", description: "Request URL" },
        headers: { type: "object", description: "Request headers" },
        body: { type: "object", description: "Request body (for POST/PUT/PATCH)" },
        timeout: { type: "integer", description: "Timeout in seconds" }
      },
      required: ["method", "url"]
    }
  },

  // ==========================================
  // 11. ENVIRONMENT / CONFIG
  // ==========================================
  {
    name: "env",
    description: `Environment and configuration:
      - get: Get environment variable
      - set: Set environment variable (session only)
      - list: List environment variables
      - load: Load .env file
      - read_config: Read config file (JSON, YAML, TOML)`,
    input_schema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["get", "set", "list", "load", "read_config"] },
        key: { type: "string", description: "Variable name" },
        value: { type: "string", description: "Variable value" },
        file: { type: "string", description: "File path for load/read_config" }
      },
      required: ["action"]
    }
  },

  // ==========================================
  // 12. PROCESS MANAGEMENT
  // ==========================================
  {
    name: "process",
    description: `Manage background processes:
      - start: Start a process in background
      - stop: Stop a background process
      - restart: Restart a process
      - list: List running processes
      - logs: View process output`,
    input_schema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["start", "stop", "restart", "list", "logs"] },
        name: { type: "string", description: "Process name/identifier" },
        command: { type: "string", description: "Command to start" },
        cwd: { type: "string", description: "Working directory" }
      },
      required: ["action"]
    }
  },

  // ==========================================
  // 13. DATABASE
  // ==========================================
  {
    name: "database",
    description: `Database operations:
      - migrate: Run migrations
      - rollback: Rollback migrations
      - seed: Run database seeds
      - query: Execute a query (if direct connection configured)
      - status: Check migration status`,
    input_schema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["migrate", "rollback", "seed", "query", "status"] },
        tool: { type: "string", enum: ["prisma", "typeorm", "knex", "sequelize", "drizzle"], description: "ORM/migration tool" },
        query: { type: "string", description: "SQL query (for query action)" },
        cwd: { type: "string", description: "Project directory" }
      },
      required: ["action", "cwd"]
    }
  },

  // ==========================================
  // 14. JIRA (Ticket Management)
  // ==========================================
  {
    name: "jira",
    description: `Jira ticket operations:
      - get: Get ticket details
      - update_status: Move ticket to new status
      - add_comment: Add comment to ticket
      - assign: Assign ticket to user
      - link_pr: Link a PR to ticket
      - search: Search tickets with JQL`,
    input_schema: {
      type: "object",
      properties: {
        action: { 
          type: "string", 
          enum: ["get", "update_status", "add_comment", "assign", "link_pr", "search"]
        },
        ticket_key: { type: "string", description: "Ticket key (e.g., ABC-123)" },
        status: { type: "string", description: "New status name" },
        comment: { type: "string", description: "Comment text" },
        assignee: { type: "string", description: "Username to assign" },
        pr_url: { type: "string", description: "PR URL to link" },
        jql: { type: "string", description: "JQL query for search" }
      },
      required: ["action"]
    }
  },

  // ==========================================
  // 15. CLIPBOARD
  // ==========================================
  {
    name: "clipboard",
    description: `Clipboard operations:
      - copy: Copy text to clipboard
      - paste: Get clipboard contents`,
    input_schema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["copy", "paste"] },
        text: { type: "string", description: "Text to copy" }
      },
      required: ["action"]
    }
  },

  // ==========================================
  // 16. BROWSER
  // ==========================================
  {
    name: "browser",
    description: `Open URLs in browser:
      - open: Open URL in default browser
      - open_pr: Open PR page in browser
      - open_repo: Open repository page
      - open_file: Open file in GitHub`,
    input_schema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["open", "open_pr", "open_repo", "open_file"] },
        url: { type: "string", description: "URL to open" },
        repo: { type: "string", description: "Repository (owner/repo)" },
        pr_number: { type: "integer", description: "PR number" },
        file_path: { type: "string", description: "File path in repo" },
        branch: { type: "string", description: "Branch name" }
      },
      required: ["action"]
    }
  }
]


// ============================================
// TOOL EXECUTORS (Stubs - Implement when ready)
// ============================================

/**
 * Execute a tool requested by Claude
 * 
 * @param name - Tool name
 * @param input - Tool input parameters
 * @param context - Execution context (tokens, configs)
 * @returns Tool execution result
 */
export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  context: ToolExecutionContext
): Promise<ToolResult> {
  
  switch (name) {
    case 'git':
      return executeGit(input)
    
    case 'file':
      return executeFile(input)
    
    case 'shell':
      return executeShell(input)
    
    case 'github':
      return executeGitHub(input, context.githubToken)
    
    case 'package':
      return executePackage(input)
    
    case 'search':
      return executeSearch(input)
    
    case 'analyze':
      return executeAnalyze(input)
    
    case 'test':
      return executeTest(input)
    
    case 'docker':
      return executeDocker(input)
    
    case 'http':
      return executeHttp(input)
    
    case 'env':
      return executeEnv(input)
    
    case 'process':
      return executeProcess(input)
    
    case 'database':
      return executeDatabase(input)
    
    case 'jira':
      return executeJira(input, context.jiraConfig)
    
    case 'clipboard':
      return executeClipboard(input)
    
    case 'browser':
      return executeBrowser(input)
    
    default:
      return { success: false, error: `Unknown tool: ${name}` }
  }
}


// ============================================
// EXECUTOR STUBS (Implement these)
// ============================================

async function executeGit(input: Record<string, unknown>): Promise<ToolResult> {
  // TODO: Implement using simple-git
  // const git = simpleGit(input.cwd as string)
  // const result = await git.raw((input.command as string).split(' '))
  return { success: false, error: 'Not implemented' }
}

async function executeFile(input: Record<string, unknown>): Promise<ToolResult> {
  // TODO: Implement using fs/promises
  return { success: false, error: 'Not implemented' }
}

async function executeShell(input: Record<string, unknown>): Promise<ToolResult> {
  // TODO: Implement using child_process
  return { success: false, error: 'Not implemented' }
}

async function executeGitHub(input: Record<string, unknown>, token: string): Promise<ToolResult> {
  // TODO: Implement using existing GitHub GraphQL client
  return { success: false, error: 'Not implemented' }
}

async function executePackage(input: Record<string, unknown>): Promise<ToolResult> {
  // TODO: Implement npm/yarn/pnpm commands
  return { success: false, error: 'Not implemented' }
}

async function executeSearch(input: Record<string, unknown>): Promise<ToolResult> {
  // TODO: Implement using ripgrep or similar
  return { success: false, error: 'Not implemented' }
}

async function executeAnalyze(input: Record<string, unknown>): Promise<ToolResult> {
  // TODO: Implement lint/format/typecheck
  return { success: false, error: 'Not implemented' }
}

async function executeTest(input: Record<string, unknown>): Promise<ToolResult> {
  // TODO: Implement test runner detection and execution
  return { success: false, error: 'Not implemented' }
}

async function executeDocker(input: Record<string, unknown>): Promise<ToolResult> {
  // TODO: Implement docker commands
  return { success: false, error: 'Not implemented' }
}

async function executeHttp(input: Record<string, unknown>): Promise<ToolResult> {
  // TODO: Implement using fetch
  return { success: false, error: 'Not implemented' }
}

async function executeEnv(input: Record<string, unknown>): Promise<ToolResult> {
  // TODO: Implement environment variable management
  return { success: false, error: 'Not implemented' }
}

async function executeProcess(input: Record<string, unknown>): Promise<ToolResult> {
  // TODO: Implement background process management
  return { success: false, error: 'Not implemented' }
}

async function executeDatabase(input: Record<string, unknown>): Promise<ToolResult> {
  // TODO: Implement database operations
  return { success: false, error: 'Not implemented' }
}

async function executeJira(
  input: Record<string, unknown>, 
  config?: ToolExecutionContext['jiraConfig']
): Promise<ToolResult> {
  // TODO: Implement Jira API calls
  return { success: false, error: 'Not implemented' }
}

async function executeClipboard(input: Record<string, unknown>): Promise<ToolResult> {
  // TODO: Implement using electron clipboard API
  return { success: false, error: 'Not implemented' }
}

async function executeBrowser(input: Record<string, unknown>): Promise<ToolResult> {
  // TODO: Implement using electron shell.openExternal
  return { success: false, error: 'Not implemented' }
}


// ============================================
// USAGE EXAMPLE (For reference)
// ============================================

/*
import Anthropic from '@anthropic-ai/sdk'
import { CODELOBBY_TOOLS, executeTool } from './ai-tools'

async function sendMessageWithTools(userMessage: string) {
  const anthropic = new Anthropic({ apiKey: 'your-key' })
  
  // Send message with all tools
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: userMessage }],
    tools: CODELOBBY_TOOLS  // Pass all tools!
  })
  
  // Process tool calls
  for (const block of response.content) {
    if (block.type === 'tool_use') {
      // Show confirmation dialog to user
      const confirmed = await showConfirmationDialog(block.name, block.input)
      
      if (confirmed) {
        const result = await executeTool(block.name, block.input, {
          githubToken: 'user-token',
          jiraConfig: { domain: 'xxx.atlassian.net', email: '...', token: '...' }
        })
        
        console.log(`Tool ${block.name}: ${result.success ? 'Success' : result.error}`)
      }
    }
  }
}
*/


// ============================================
// TOOL SUMMARY
// ============================================
/*
┌─────────────────────────────────────────────────────────────┐
│  CODELOBBY AI TOOLS - 16 Tools for Complete Dev Coverage   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  VERSION CONTROL                                            │
│  └── git: All git commands (pull, push, checkout, etc.)    │
│                                                              │
│  FILE SYSTEM                                                │
│  └── file: Read, write, delete, copy, move files           │
│                                                              │
│  TERMINAL                                                   │
│  └── shell: Run any shell command                          │
│                                                              │
│  GITHUB                                                     │
│  └── github: PRs, reviews, merge, labels, comments         │
│                                                              │
│  PACKAGE MANAGEMENT                                         │
│  └── package: npm, yarn, pnpm operations                   │
│                                                              │
│  CODE SEARCH                                                │
│  └── search: Grep, find files, find & replace              │
│                                                              │
│  CODE QUALITY                                               │
│  └── analyze: Lint, format, typecheck                      │
│                                                              │
│  TESTING                                                    │
│  └── test: Run tests, coverage, watch mode                 │
│                                                              │
│  CONTAINERS                                                 │
│  └── docker: Build, run, compose, logs                     │
│                                                              │
│  API TESTING                                                │
│  └── http: HTTP requests (GET, POST, etc.)                 │
│                                                              │
│  CONFIGURATION                                              │
│  └── env: Environment variables, .env files                │
│                                                              │
│  PROCESS MANAGEMENT                                         │
│  └── process: Background servers, process control          │
│                                                              │
│  DATABASE                                                   │
│  └── database: Migrations, seeds, queries                  │
│                                                              │
│  JIRA                                                       │
│  └── jira: Tickets, status, comments                       │
│                                                              │
│  CLIPBOARD                                                  │
│  └── clipboard: Copy/paste text                            │
│                                                              │
│  BROWSER                                                    │
│  └── browser: Open URLs, PR pages                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
*/
