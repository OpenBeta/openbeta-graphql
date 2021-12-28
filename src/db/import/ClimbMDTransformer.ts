import { fromMarkdown } from 'mdast-util-from-markdown'
import { is } from 'unist-util-is'
import { IClimbContent } from '../ClimbTypes'
import { IAreaContent } from '../AreaTypes'
import { Content } from 'mdast-util-from-markdown/lib'

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
  return {
    description: mdLines.slice(h1LineNumbers[0], h1LineNumbers[1] - 1).join('\n'),
    location: mdLines.slice(h1LineNumbers[1], h1LineNumbers[2] - 1).join('\n'),
    protection: mdLines.slice(h1LineNumbers[2], h1LineNumbers[3]).join('\n')
  }
}

export const transformArea = (md: string): IAreaContent => {
  const mdLines = md.split('\n')
  const h1LineNumbers = h1Markers(md)
  return {
    description: mdLines.slice(h1LineNumbers[0], h1LineNumbers[1] - 1).join('\n')
  }
}
