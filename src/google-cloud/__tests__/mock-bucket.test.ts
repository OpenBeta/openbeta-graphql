import { LocalFileStorage } from '../mock-storage-bucket'
import fs from 'fs/promises'
import path from 'path'
import { BucketStorageError } from '../bucket'
import { jest } from '@jest/globals'
import sharp from 'sharp'

async function generateSmallImage (format?: 'jpeg' | 'png' | 'avif'): Promise<{ filename: string, outputPath: string, width: number, height: number, data: Buffer }> {
  const filename = `test.${process.uptime()}.${format ?? 'jpg'}`
  const outputPath = `./bucket/${filename}`
  const width: number = Math.floor(100 * Math.random()) + 10
  const height: number = Math.floor(100 * Math.random()) + 10

  // Create a simple white buffer as the base image
  const whiteBuffer = Buffer.from(
      `<svg width="${width}" height="${height}">
        <rect width="100%" height="100%" fill="white"/>
      </svg>`
  )

  if (format === 'png') {
    await sharp(whiteBuffer, {})
      .png()
      .toFile(outputPath)
  } else if (format === 'avif') {
    await sharp(whiteBuffer, {})
      .avif()
      .toFile(outputPath)
  } else {
    await sharp(whiteBuffer, {})
      .jpeg()
      .toFile(outputPath)
  }

  return { filename, outputPath, width, height, data: await fs.readFile(outputPath) }
}

describe('LocalFileStorage', () => {
  let storage: LocalFileStorage
  const bucketDir = './bucket'

  beforeEach(async () => {
    storage = new LocalFileStorage()
    // Create the bucket directory if it doesn't exist
    await fs.mkdir(bucketDir, { recursive: true })
  })

  afterEach(async () => {
    // Clean up the bucket directory after each test
    try {
      const files = await fs.readdir(bucketDir)
      await Promise.all(files.filter(i => i.startsWith('test.')).map(async file => await fs.unlink(path.join(bucketDir, file))))
      await fs.rmdir(bucketDir)
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error('Error cleaning up bucket directory:', error)
      }
    }
    jest.clearAllMocks()
  })

  describe('signedUrl', () => {
    it('should return a signed URL with the correct path and expiration', async () => {
      const filePath = 'test/image.jpg'
      const result = await storage.signedUrl(filePath)
      expect(result.url).toBe(`http://localhost:4000/rest/media/${filePath}`)
      expect(result.expires).toBeGreaterThan(Date.now())
      // Check if expiration is approximately 15 minutes from now
      expect(result.expires).toBeLessThan(Date.now() + (15 * 60 * 1000) + 1000) // Adding a small buffer
    })
  })

  describe('deleteFile', () => {
    it('should delete an existing file', async () => {
      const { filename, outputPath } = await generateSmallImage()
      await storage.deleteFile(filename)
      await expect(fs.access(outputPath)).rejects.toThrow('ENOENT')
    })

    it('should throw an error if the file does not exist', async () => {
      const filePath = 'nonexistent.txt'
      await expect(storage.deleteFile(filePath)).rejects.toThrow(Error("ENOENT: no such file or directory, unlink './bucket/nonexistent.txt'"))
    })
  })

  describe('getFileInfo', () => {
    it('should return file info for a JPEG image', async () => {
      const { filename, data, width, height } = await generateSmallImage()
      const result = await storage.getFileInfo(filename)
      expect(result.size).toBe(data.length)
      expect(result.width).toBe(width)
      expect(result.height).toBe(height)
      expect(result.format).toBe('jpeg')
    })

    it('should return file info for a PNG image', async () => {
      const { filename, data, width, height } = await generateSmallImage('png')
      const result = await storage.getFileInfo(filename)
      expect(result.size).toBe(data.length)
      expect(result.width).toBe(width)
      expect(result.height).toBe(height)
      expect(result.format).toBe('png')
    })

    it('should return file info for an AVIF image', async () => {
      const { filename, data, width, height } = await generateSmallImage('avif')
      const result = await storage.getFileInfo(filename)
      expect(result.size).toBe(data.length)
      expect(result.width).toBe(width)
      expect(result.height).toBe(height)
      expect(result.format).toBe('avif')
    })

    it('should throw BucketStorageError if fileTypeFromFile returns undefined', async () => {
      const filePath = 'unknown.file'
      const fullPath = path.join(bucketDir, filePath)
      await fs.writeFile(fullPath, Buffer.from('unknown data'))
      await expect(storage.getFileInfo(filePath)).rejects.toThrow(BucketStorageError)
    })

    it('should throw BucketStorageError if width or height is undefined after decoding an image', async () => {
      const filePath = 'broken.jpg'
      const fullPath = path.join(bucketDir, filePath)
      await fs.writeFile(fullPath, Buffer.from('corrupted jpeg data'))
      await expect(storage.getFileInfo(filePath)).rejects.toThrow(BucketStorageError)
    })
  })
})
