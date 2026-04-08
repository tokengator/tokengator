import { existsSync } from 'node:fs'

type PackageJson = {
  dependencies?: Record<string, string>
  name?: string
  packageManager?: string
  private?: boolean
  version?: string
}

async function readPackageJson(path: string) {
  return (await Bun.file(path).json()) as PackageJson
}

function resolveInstalledManifestPath(name: string) {
  const manifestPaths = [`packages/db/node_modules/${name}/package.json`, `node_modules/${name}/package.json`]

  return manifestPaths.find(existsSync)
}

async function getRuntimeDependencies() {
  const dbPackage = await readPackageJson('packages/db/package.json')
  const dependencyEntries = Object.entries(dbPackage.dependencies ?? {}).filter(
    ([, version]) => version !== 'workspace:*',
  )

  const dependencies = await Promise.all(
    dependencyEntries.map(async ([name]) => {
      const manifestPath = resolveInstalledManifestPath(name)

      if (!manifestPath) {
        throw new Error(`Missing installed manifest for ${name}`)
      }

      const manifest = await readPackageJson(manifestPath)

      if (!manifest.version) {
        throw new Error(`Missing installed version for ${name}`)
      }

      return [name, manifest.version] as const
    }),
  )

  return Object.fromEntries(dependencies.toSorted(([left], [right]) => left.localeCompare(right)))
}

const rootPackage = await readPackageJson('package.json')
const dependencies = await getRuntimeDependencies()

await Bun.write(
  'package.json',
  `${JSON.stringify(
    {
      dependencies,
      name: 'tokengator-runtime-deps',
      packageManager: rootPackage.packageManager,
      private: true,
      scripts: {
        prestart: 'bun run --cwd packages/db db:push',
        start: 'bun run ./apps/api/dist/index.runtime.mjs',
      },
    },
    null,
    2,
  )}\n`,
)
