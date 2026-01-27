export type Processor<T> = (data: T[], chunkCount: number) => Promise<void>

export interface MongoCollectionProcessorOptions<ChunkType, SourceDataType> {
  /**
   * A callback that is called before the data is processed.
   * Use it to do any setup that needs to be done before the data is processed, e.g.
   * creating a new Typesense collection, or deleting an existing one.
   */
  preProcess?: () => Promise<void>
  /**
   * A converter function that converts the data from the source format to the
   * target format.
   * It is called per chunk, so it should be fast.
   * @param data The data to convert
   * @returns The converted data
   */
  converter: (data: SourceDataType) => ChunkType
  /**
   * A generator function that yields chunks of data.
   * Common queries can be found in src/db/export/queries/
   * @returns A generator that yields chunks of data
   */
  dataGenerator: () => AsyncGenerator<SourceDataType[]>
  /**
   * A function that is called for every batch of data
   * after is has been converted.
   * Use it to upload the data to some external service or database.
   * @param chunk the chunk of data to process
   */
  processChunk: Processor<ChunkType>
}

/**
 * Uses the provided data generator, converters and processors to process
 * data from the database and upload it to an external service provided by the processor.
 *
 * ChunkType just needs to be any Object type that conforms to whatever
 * schema this method is supposed to be satisfying.
 */
export async function processMongoCollection<ChunkType, SourceDataType> (
  options: MongoCollectionProcessorOptions<ChunkType, SourceDataType>
): Promise<void> {
  // start by completely refreshing this collection. (Delete and stand back up)
  await options.preProcess?.()

  let chunkCount = 0
  for await (const chunk of options.dataGenerator()) {
    // upload the chunk as an array of translated objects
    await options.processChunk(chunk.map(options.converter), chunkCount++)
  }
}
