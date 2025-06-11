import express, { Request, Response } from 'express'
import path from 'path'
import fs from 'fs/promises'
import { logger } from '../logger.js'
import { mediaAdded } from './adapter-interface.js'

const router = express.Router()

/**
 * PUT /rest/upload/:filename
 * Uploads raw file data from the request body to the local bucket.
 * The filename in the URL will be used as the final name of the file.
 */
router.put('/media/:filename', (req: Request, res: Response) => {
  void (async () => {
    const filename = req.params.filename
    const filePath = path.join('./bucket', filename) // Adjust path as needed

    try {
      if (req.body === undefined || req.body === '' || req.body.length === 0) {
        return res.status(400).json({ error: 'No file data in the request body.' })
      }

      // Ensure the 'bucket' directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true })
      // Write the raw request body to the specified file path
      await fs.writeFile(filePath, req.body)

      res.status(200).json({ message: 'File uploaded successfully.', path: filename })
      // For mocking purposes, we don't need to do anything other than imagine that
      // the hook is called by the remote.
      // There is an unfortunate amount of logic wrapped into the google POST handler
      void mediaAdded({ objectId: filename })
    } catch (error: any) {
      if (error instanceof Error) {
        res.status(500).json({ error: `Failed to upload file: ${error.message}` })
      } else {
        res.status(500).json({ error: 'Failed to upload file because of an unspecified error' })
      }
    }
  })().catch(logger.error)
})

/**
 * GET /rest/upload/:filename
 * Retrieves a file from the local bucket.
 */
router.get('/media/:filename', (req: Request, res: Response) => {
  void (async () => {
    const filename = req.params.filename
    const filePath = path.join('./bucket', filename) // Adjust path as needed

    try {
      await fs.access(filePath)
      res.sendFile(filePath)
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({ error: 'File not found.' })
      }
      console.error('Error retrieving file:', error)
      res.status(500).json({ error: 'Failed to retrieve file.' })
    }
  })().then(() => logger.info('Image uploaded!')).catch(logger.error)
})

export default router
