import { promises } from 'fs'
import { Processor } from '../common/processor.js'
import path from 'path'
import { logger } from '../../../logger.js'

export type Writer = (data: string, path: string) => Promise<void>
export type PathResolver<T> = (data: T) => string

export interface FileProcessorOptions<T> {
  basePath: string
  subPathResolver?: PathResolver<T>
  fileNameResolver: PathResolver<T>
  writer?: Writer
}

export function asyncFileProcessor<T> ({
  writer = async (data, path) => await promises.writeFile(path, data, 'utf-8'),
  ...options
}: FileProcessorOptions<T>): Processor<T> {
  return async (data: T[]): Promise<void> => {
    return await Promise.allSettled(data.map(async (item) => {
      const filePath = resolveFilePath(item, options)
      logger.info(`saving to file ${filePath}`)
      return await writer(JSON.stringify(item), filePath)
    })).then(async results => {
      const errorCount = results.filter(result => result.status === 'rejected').length
      const errors = joinErrors(results, data, options)

      if (errorCount > 0) { throw new Error(`Failed to write ${errorCount}/${results.length} files: ${errors}`) } else { return await Promise.resolve() }
    })
  }
}

function resolveFilePath<T> (item: T, {
  basePath,
  fileNameResolver,
  subPathResolver
}: { basePath: string, fileNameResolver: PathResolver<T>, subPathResolver?: PathResolver<T> }): string {
  if (subPathResolver != null) {
    basePath = path.join(basePath, subPathResolver(item))
  }
  return path.resolve(basePath, `${fileNameResolver(item)}.json`)
}

function joinErrors<T> (results: Array<PromiseSettledResult<Awaited<Promise<void>>>>, data: T[], options: Omit<FileProcessorOptions<T>, 'writer'>): string {
  return results.map(extractError(data, options))
    .filter(error => error !== undefined)
    .join(', ')
}

function extractError<T> (data: T[], options: Omit<FileProcessorOptions<T>, 'writer'>) {
  return (result: PromiseSettledResult<void>, index: number) => {
    if (result.status === 'rejected') { return `${resolveFilePath(data[index], options)} (${result.reason as string})` } else { return undefined }
  }
}
