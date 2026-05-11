import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { OpenAPIGenerator } from '@orpc/openapi'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
import { $ } from 'bun'

import { appRouter } from './router'

export const openApiDocumentPath = fileURLToPath(new URL('../openapi.json', import.meta.url))

export async function writeOpenApiDocument(path = openApiDocumentPath) {
  const generator = new OpenAPIGenerator({
    schemaConverters: [new ZodToJsonSchemaConverter()],
  })
  const document = await generator.generate(appRouter)

  await writeFile(path, `${JSON.stringify(document, null, 2)}\n`)
  await $`${fileURLToPath(new URL('../../../node_modules/.bin/oxfmt', import.meta.url))} --write ${path}`

  return document
}
