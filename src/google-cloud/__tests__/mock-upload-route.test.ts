import request from 'supertest'
import express, { Express } from 'express'
import router from '../mock-storage-upload'
import fs from 'fs/promises'
import path from 'path'
import { jest } from '@jest/globals'
import inMemoryDB from '../../utils/inMemoryDB'

describe('Development Media Upload Route', () => {
  let app: Express
  const bucketDir = path.join('./bucket')

  beforeAll(async () => {
    await inMemoryDB.connect()
    // Create a temporary bucket directory if it doesn't exist
    await fs.mkdir(bucketDir, { recursive: true })
    app = express()
    app.use(express.raw({ type: '*/*' }))
    app.use('/rest', router)
  })

  afterEach(async () => {
    // Clean up the bucket directory after each test
    try {
      const files = await fs.readdir(bucketDir)
      await Promise.all(files.map(async file => await fs.unlink(path.join(bucketDir, file))))
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error('Error cleaning up bucket directory:', error)
      }
    }
    jest.clearAllMocks()
  })

  afterAll(async () => {
    // Remove the bucket directory after all tests
    try {
      await fs.rmdir(bucketDir)
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error('Error removing bucket directory:', error)
      }
    }
    await inMemoryDB.close()
  })

  it('should successfully upload raw file data', async () => {
    const filename = 'test-upload.txt'
    const fileContent = Buffer.from('This is some test content.')

    const response = await request(app)
      .put(`/rest/media/${filename}`)
      .send(fileContent)
      .set('Content-Type', 'text/plain')

    expect(response.statusCode).toBe(200)
    expect(response.body).toEqual({ message: 'File uploaded successfully.', path: filename })

    // Check if the file was actually created in the bucket
    const filePath = path.join(bucketDir, filename)
    const uploadedContent = await fs.readFile(filePath)
    expect(uploadedContent).toEqual(fileContent)
  })

  it('should return 400 if no file data is in the request body', async () => {
    const filename = 'empty-upload.txt'

    const response = await request(app)
      .put(`/rest/media/${filename}`)
      .send('')
      .set('Content-Type', 'text/plain')

    expect(response.statusCode).toBe(400)
    expect(response.body).toEqual({ error: 'No file data in the request body.' })

    // Check if the file was NOT created
    const filePath = path.join(bucketDir, filename)
    await expect(fs.access(filePath)).rejects.toThrow('ENOENT')
  })

  it('should handle errors during file writing and return 500', async () => {
    const filename = 'error-upload.txt'
    const fileContent = Buffer.from('This should fail.')

    // Mock fs.writeFile to throw an error
    const originalWriteFile = fs.writeFile
    // @ts-expect-error
    fs.writeFile = jest.fn().mockRejectedValue(new Error('Simulated file system error'))

    const response = await request(app)
      .put(`/rest/media/${filename}`)
      .send(fileContent)
      .set('Content-Type', 'text/plain')

    expect(response.statusCode).toBe(500)
    expect(response.body.error).toContain('Failed to upload file')

    // Check if the file was NOT created
    const filePath = path.join(bucketDir, filename)
    await expect(fs.access(filePath)).rejects.toThrow('ENOENT')
    // Restore the original fs.writeFile
    fs.writeFile = originalWriteFile
  })
})
