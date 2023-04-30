export type ImageFormatType = 'jpeg' | 'png' | 'webp' | 'avif'
export interface MediaObjectType {
  mediaUrl: string
  width: number
  height: number
  format: ImageFormatType
  mtime: Date
  birthTime: Date
  size: number
}
