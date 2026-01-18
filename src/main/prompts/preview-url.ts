/**
 * Preview URL Extraction Prompt
 *
 * Used by the "Open Preview" feature (globe icon).
 * Finds preview/staging URLs from PR descriptions and comments.
 */

export interface PreviewURLContext {
  title: string
  body: string | null
  comments: Array<{
    author: string
    body: string
  }>
}

/**
 * Build the preview URL extraction prompt
 */
export function buildPreviewURLPrompt(context: PreviewURLContext): string {
  const commentsSection = context.comments.map((c) => `**${c.author}**: ${c.body}`).join('\n\n')

  return `Find the preview/demo environment URL for this Pull Request.

## PR Title
${context.title}

## PR Description
${context.body || 'No description provided'}

## Comments
${commentsSection || 'No comments'}

---

Look through the PR description and comments to find a URL to a preview, staging, or demo deployment of this PR's changes. This could be posted by a bot or a human.

Common patterns to look for:
- Vercel preview URLs (vercel.app)
- Netlify deploy previews (netlify.app)
- GitHub Pages deployments
- Custom staging/preview domains
- Bot comments with deployment links

Respond with ONLY the URL if found. If no preview URL exists, respond with: NO_PREVIEW_URL_FOUND`
}
