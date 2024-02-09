import { logger } from '../../../logger.js'
import { bulkImportJson } from './import-json.js'

export const importJsonRequestHandler = async (req, res): Promise<void> => {
  try {
    const result = await bulkImportJson({ json: req.body, user: req.userId })
    if (result.errors.length > 0) {
      logger.error(`Error importing JSON: ${result.errors.map(e => e.toString()).join(', ')}`)
      res.status(500).send({ message: 'Error importing JSON', errors: result.errors.map((e) => e.toString()) })
    } else {
      res.status(200).send(result)
      logger.info(`Imported JSON: ${result.addedAreaIds.length} areas created, ${result.updatedAreaIds.length} areas updated, ${result.climbIds.length} climbs updated or added`)
    }
  } catch (e) {
    logger.error(`Error importing JSON: ${e.toString() as string}`)
    res.status(500).send(`Error importing JSON: ${e.toString() as string}`)
  }
}
