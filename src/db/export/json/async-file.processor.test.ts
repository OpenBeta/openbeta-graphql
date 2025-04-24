import { logger } from '../../../logger'
import { Processor } from '../common/processor'
import { asyncFileProcessor, Writer } from './async-file.processor'
import path from 'path'

interface TestType { name: string, path?: string[] }

describe('file processor', () => {
  const writer = vi.fn(async (_data, _path) => await Promise.resolve())
  const testData: TestType[] = [{ name: 'test', path: ['one', 'two'] }, { name: 'test2' }]
  const testPath = 'testPath'

  function assertWriterCalledFor (data: TestType): void {
    expect(writer).toHaveBeenCalledWith(JSON.stringify(data), path.resolve(testPath, ...data.path ?? '', `${data.name}.json`))
  }

  function createProcessor (w: Writer = writer): Processor<TestType> {
    return asyncFileProcessor({
      basePath: testPath,
      fileNameResolver: (data: TestType) => data.name,
      subPathResolver: (data: TestType) => data.path?.join(path.sep) ?? '',
      writer: w
    })
  }

  function withFailedWriteOn (failingData: TestType): (data: any, path: any) => Promise<void> {
    return async (data, path) => {
      logger.info(data, failingData)
      if (data === JSON.stringify(failingData)) {
        return await Promise.reject(new Error('IO: We made this error'))
      }

      return await writer(data, path)
    }
  }

  it('should write the correct data to a file', async () => {
    const processor = createProcessor()

    await processor(testData, 2)

    assertWriterCalledFor(testData[0])
    assertWriterCalledFor(testData[1])
  })

  it('should continue batch processing on error', async () => {
    const processor = createProcessor(withFailedWriteOn(testData[0]))

    // First, check that our failed writer fires as expected
    await expect(async () => await withFailedWriteOn(testData[0])(JSON.stringify(testData[0]), 'path')).rejects.toThrow('IO: We made this error')
    // now in the context of a strem, we should expect 1 out of two possible files to fail
    await expect(async () => await processor(testData, 0)).rejects.toThrow('Failed to write 1/2 files')

    assertWriterCalledFor(testData[1])
  })
})
