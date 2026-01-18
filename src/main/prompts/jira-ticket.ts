/**
 * Jira Ticket Extraction Prompt
 *
 * Used by the "Find Jira Ticket" feature (ticket icon).
 * Finds Jira ticket references from PR titles, descriptions, branch names, and comments.
 */

export interface JiraTicketContext {
  title: string
  body: string | null
  branchName: string
  comments: Array<{
    author: string
    body: string
  }>
}

/**
 * Build the Jira ticket extraction prompt
 */
export function buildJiraTicketPrompt(context: JiraTicketContext): string {
  const commentsSection = context.comments.map((c) => `**${c.author}**: ${c.body}`).join('\n\n')

  return `Find the Jira ticket associated with this Pull Request.

## PR Title
${context.title}

## Branch Name
${context.branchName}

## PR Description
${context.body || 'No description provided'}

## Comments
${commentsSection || 'No comments'}

---

Your task is to find a Jira ticket reference in this PR's context. Jira tickets follow specific patterns.

## How to identify Jira tickets:

1. **Standard Jira key format**: PROJECT-NUMBER (e.g., ABC-123, PORTAL-456, JIRA-789)
   - PROJECT is typically 2-10 uppercase letters
   - NUMBER is a positive integer
   - Examples: DEV-1234, FEAT-99, BUG-5678, CORE-12

2. **Common locations to check** (in order of priority):
   - Branch name (e.g., "feature/ABC-123-add-login" or "ABC-123/add-feature")
   - PR title (e.g., "[ABC-123] Fix authentication" or "ABC-123: Add new feature")
   - PR description (often at the beginning or in a "Ticket:" field)
   - Comments (someone might mention "This relates to ABC-123")

3. **Jira URL patterns** (if a full URL is provided):
   - https://company.atlassian.net/browse/ABC-123
   - https://jira.company.com/browse/ABC-123
   - Any URL containing "/browse/PROJECT-NUMBER"

## What to return:

If you find a Jira ticket:
- If a full Jira URL is found, return: JIRA_URL:https://full-url-here
- If only a ticket key is found (e.g., ABC-123), return: JIRA_KEY:ABC-123

If NO Jira ticket is found after checking all sources, return: NO_JIRA_TICKET_FOUND

## Important:
- Return ONLY the most relevant ticket (the one this PR is likely about)
- If multiple tickets are mentioned, prefer the one in the branch name or title
- Do not make up ticket numbers - only return what you actually find
- The response should be a single line with no extra text`
}
