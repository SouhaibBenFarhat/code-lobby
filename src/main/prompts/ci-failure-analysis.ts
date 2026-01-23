/**
 * CI Failure Analysis Prompt
 *
 * Used by the "Analyze Failure" button on failed CI checks.
 * AI analyzes the CI output and provides a human-readable summary.
 */

export interface CIFailureContext {
  checkName: string
  conclusion: string | null
  output: {
    title: string | null
    summary: string | null
    text: string | null
  }
  annotations: Array<{
    path: string
    startLine: number
    endLine: number
    annotationLevel: string
    message: string
    title: string | null
    rawDetails: string | null
  }>
}

export function buildCIFailureAnalysisPrompt(context: CIFailureContext): string {
  // Build annotations section
  let annotationsSection = ''
  if (context.annotations.length > 0) {
    annotationsSection = '\n\n## Error Annotations:\n'
    for (const annotation of context.annotations) {
      annotationsSection += `\n### ${annotation.path}:${annotation.startLine}`
      if (annotation.title) {
        annotationsSection += ` - ${annotation.title}`
      }
      annotationsSection += `\n**Level:** ${annotation.annotationLevel}\n`
      annotationsSection += `**Message:** ${annotation.message}\n`
      if (annotation.rawDetails) {
        annotationsSection += `\n\`\`\`\n${annotation.rawDetails.slice(0, 2000)}\n\`\`\`\n`
      }
    }
  }

  // Build output section
  let outputSection = ''
  if (context.output.title || context.output.summary || context.output.text) {
    outputSection = '\n\n## CI Output:\n'
    if (context.output.title) {
      outputSection += `**Title:** ${context.output.title}\n`
    }
    if (context.output.summary) {
      outputSection += `**Summary:** ${context.output.summary.slice(0, 2000)}\n`
    }
    if (context.output.text) {
      // Allow more text when we have actual logs (up to 15KB)
      const maxTextSize = 15000
      const text = context.output.text.slice(-maxTextSize) // Keep the END which has the failure
      outputSection += `\n\`\`\`\n${text}\n\`\`\`\n`
    }
  }

  return `You are a CI/CD expert helping a developer understand why their build failed.

Analyze the following CI check failure and provide:
1. **Summary**: A one-line explanation of what failed
2. **Root Cause**: The specific error or issue causing the failure
3. **Suggested Fix**: Actionable steps to resolve the issue

Keep your response concise and developer-friendly. Use markdown formatting.

## CI Check Details:
- **Name:** ${context.checkName}
- **Conclusion:** ${context.conclusion || 'unknown'}
${outputSection}${annotationsSection}

Respond with a brief, helpful analysis. Focus on the actionable fix.`
}

/**
 * CI Failure Analysis System Prompt
 * Used as the system message for Claude API
 */
export const CI_FAILURE_ANALYSIS_SYSTEM_PROMPT = `You are an expert CI/CD assistant embedded in a PR review tool.
Your job is to analyze CI failures and explain them clearly to developers.

Guidelines:
- Be concise - developers are busy
- Focus on the ROOT CAUSE, not symptoms
- Provide ACTIONABLE fix suggestions
- Use code blocks for specific fixes
- If the error is a test failure, identify the failing test and expected vs actual values
- If it's a lint/type error, show the exact fix needed
- If it's a build error, explain what dependency or config is wrong
- Look for actual error messages in the CI logs (timestamps like "2024-01-01T00:00:00Z" indicate log lines)
- Search for keywords like "error", "failed", "Error:", "FAILED", "npm ERR!", "exit code"

Format your response as:
**Summary:** [one-line what failed]

**Root Cause:** [specific error - quote the actual error message from logs if available]

**Fix:** [actionable steps]`
