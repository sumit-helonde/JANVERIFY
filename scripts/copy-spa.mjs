import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const dist = join(root, 'frontend', 'dist')
const target = join(root, 'api', 'static')

if (!existsSync(dist)) {
  console.error(`copy-spa: ${dist} not found, run the frontend build first`)
  process.exit(1)
}

await rm(target, { recursive: true, force: true })
await mkdir(target, { recursive: true })
await cp(dist, target, { recursive: true })
console.log(`copy-spa: frontend/dist -> api/static`)
