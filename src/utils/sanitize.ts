import sanitizeHtml from 'sanitize-html'

/**
 * Sanitize paragraphs for description/block of text
 * @param text user input
 * @returns sanitized text
 */
export const sanitize = (text: string): string => sanitizeHtml(text, {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
  allowedAttributes: {
    a: ['href']
  }
})

/**
 * Strict sanitize text for heading & title
 * @param text user input
 * @returns sanitized text
 */
export const sanitizeStrict = (text: string): string => sanitizeHtml(text, {
  allowedTags: [],
  allowedAttributes: {
  }
})
