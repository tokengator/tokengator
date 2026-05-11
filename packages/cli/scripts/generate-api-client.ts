import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createClient } from '@hey-api/openapi-ts'

const GENERATED_CLIENT_DIR = fileURLToPath(new URL('../src/api/generated', import.meta.url))
const OPENAPI_DOCUMENT_PATH = fileURLToPath(new URL('../../api/openapi.json', import.meta.url))

async function getOpenApiSpec() {
  return JSON.parse(await readFile(OPENAPI_DOCUMENT_PATH, 'utf8'))
}

async function main() {
  await createClient({
    input: await getOpenApiSpec(),
    output: {
      clean: true,
      path: GENERATED_CLIENT_DIR,
    },
    plugins: [
      '@hey-api/typescript',
      {
        name: '@hey-api/client-fetch',
        throwOnError: true,
      },
      {
        name: '@hey-api/sdk',
        responseStyle: 'data',
      },
    ],
  })
}

main()
