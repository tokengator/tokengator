const SQLITE_VARIABLE_LIMIT = 900

export function getRunLookupChunkSize(statusCount: number) {
  return Math.max(1, SQLITE_VARIABLE_LIMIT - Math.max(statusCount, 0))
}

export function getSqliteChunkSize(columnsPerRow: number) {
  return Math.max(1, Math.floor(SQLITE_VARIABLE_LIMIT / Math.max(columnsPerRow, 1)))
}

export function splitIntoChunks<T>(values: T[], chunkSize: number) {
  const chunks: T[][] = []

  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize))
  }

  return chunks
}
