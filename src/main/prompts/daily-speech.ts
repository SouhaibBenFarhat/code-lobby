/**
 * Daily Speech Prompt
 *
 * Used by the "Generate Daily" feature in the user profile.
 * Creates a casual standup-style summary of the user's activity.
 */

export interface DailySpeechEvent {
  type: string
  description: string
  repoName?: string
  prNumber?: number
  prTitle?: string
  prDescription?: string
  timestamp: string
}

export interface DailySpeechContext {
  username: string
  date: string
  events: DailySpeechEvent[]
}

/**
 * Build the daily speech generation prompt
 */
export function buildDailySpeechPrompt(context: DailySpeechContext): string {
  const eventsSummary = context.events
    .map((e, i) => {
      let eventText = `${i + 1}. **${e.type}** - ${e.description}`
      if (e.repoName) {
        eventText += ` (${e.repoName})`
      }
      if (e.prNumber && e.prTitle) {
        eventText += `\n   PR #${e.prNumber}: ${e.prTitle}`
      }
      if (e.prDescription) {
        eventText += `\n   Description: ${e.prDescription.slice(0, 500)}${e.prDescription.length > 500 ? '...' : ''}`
      }
      return eventText
    })
    .join('\n\n')

  return `Generate a casual daily standup speech for a software engineer based on their GitHub activity from the last 24 hours.

## Developer
${context.username}

## Date
${context.date}

## Activity (${context.events.length} events)
${eventsSummary || 'No activity recorded'}

---

Create a brief, natural-sounding standup update in first person. The speech should:
1. Start with a greeting and brief overview of what was accomplished
2. List 3-5 key accomplishments as bullet points (combine related activities)
3. Mention any work in progress or items that need follow-up
4. End with 1-2 suggestions of what to focus on next based on the activity

Keep it conversational and under 200 words. Use casual language like "Yesterday I..." or "I've been working on...".

Format the response in Markdown with:
- A brief intro paragraph
- A "What I accomplished" section with bullet points
- A "What's next" section with 1-2 items

Do NOT include the word "standup" or mention this is a generated summary.`
}
