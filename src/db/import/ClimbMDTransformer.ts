import { fromMarkdown } from 'mdast-util-from-markdown'
import { Content } from 'mdast-util-from-markdown/lib'
import { is } from 'unist-util-is'
import { IClimbContent } from '../ClimbTypes'
import { IAreaContent } from '../AreaTypes'

// Find each H1's line number
const h1Markers = (rawMd): number[] => {
  const mdast = fromMarkdown(rawMd)
  return mdast.children.reduce<number[]>(
    (acc: number[], curr: Content) => {
      if (is(curr, { type: 'heading', depth: 1 })) {
        const line = curr?.position?.start.line ?? -1
        if (line !== -1) {
          acc.push(line)
        }
      }
      return acc
    }, [])
}

export const transformClimb = (md: string): IClimbContent => {
  const mdLines = md.split('\n')
  const h1LineNumbers = h1Markers(md)
  const expectedH1s = 3
  if (h1LineNumbers.length < expectedH1s) {
    // don't bother with bad data
    return {
      description: '',
      location: '',
      protection: ''
    }
  }
  return {
    description: mdLines.slice(h1LineNumbers[0], h1LineNumbers[1] - 1).join('\n').trim(),
    location: mdLines.slice(h1LineNumbers[1], h1LineNumbers[2] - 1).join('\n').trim(),
    protection: mdLines.slice(h1LineNumbers[2], lastIndex(h1LineNumbers, expectedH1s)).join('\n').trim()
  }
}

export const transformArea = (md: string): IAreaContent => {
  const mdLines = md.split('\n')
  const h1LineNumbers = h1Markers(md)
  const expectedH1s = 1
  if (h1LineNumbers.length < expectedH1s) {
    // missing a H1
    return {
      description: ''
    }
  }
  return {
    description: mdLines.slice(h1LineNumbers[0], lastIndex(h1LineNumbers, expectedH1s)).join('\n').trim()
  }
}

// In case there are more H1s than what we need, calculate the last index to copy.
// If not copy to end of document.  Example:
// # Heading 1
// Text
// # Heading 2
// Text         <--- lastIndex is here if maxExpected = 2
// # Heading 3
// Text
const lastIndex = (headings: number[], maxExpected: number): number|undefined => headings.length > maxExpected ? headings[maxExpected] - 1 : undefined
