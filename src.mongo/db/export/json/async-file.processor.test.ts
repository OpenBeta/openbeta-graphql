import { asyncFileProcessor, Writer } from './async-file.processor'
import path from 'path'

interface TestType { name: string, path?: string[] }

describe('file processor', () => {
  const writer = jest.fn(async (_data, _path) => await Promise.resolve())
  const testData: TestType[] = [{ name: 'test', path: ['one', 'two'] }, { name: 'test2' }]
  const testPath = 'testPath'

  function assertWriterCalledFor (data: TestType) {
    expect(writer).toHaveBeenCalledWith(JSON.stringify(data), path.resolve(testPath, ...data.path ?? '', `${data.name}.json`))
  }

  function createProcessor (w: Writer = writer) {
    return asyncFileProcessor({
      basePath: testPath,
      fileNameResolver: (data: TestType) => data.name,
      subPathResolver: (data: TestType) => data.path?.join(path.sep) ?? '',
      writer: w
    })
  }

  function withFailedWriteOn (failingData: { name: string }) {
    return async (data, path) => {
      if (data === JSON.stringify(failingData)) {
        return await Promise.reject('error')
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

    await expect(processor(testData, 0)).rejects.toContain('Failed to write 1/2 files')

    assertWriterCalledFor(testData[1])
  })
})
