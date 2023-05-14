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
}).trim()

export const trimToNull = (text?: string): string | null => {
  return text?.trim() ?? null
}

// export const trimInputObjectToNull = (input: Record<string, string | undefined >): Record<string, string | undefined > | null => {
//   const o: Record<string, string | undefined > = {}

//   for (const k in input) {
//     if (trimToNull(input[k]) == null) {
//       o[k] = 'j'
//     }
//   }
//   if (Object.keys(o).length === 0) {
//     return null
//   }

//   return o
// }
