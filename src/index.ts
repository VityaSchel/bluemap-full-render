import { createCanvas, loadImage as loadImageCanvas } from 'canvas'
import { glob } from 'glob'
import path from 'path'
import fs from 'fs'
import { renderMapTile } from './render.js'
import { loadImage } from './utils.js'
import yargs from 'yargs'

const args = await yargs(process.argv.slice(2))
  .command(
    "$0 <path to bluemap's `1` directory> <path to output directory>",
    'Render maps',
  )
  .epilogue('GitHub: https://github.com/VityaSchel/bluemap-full-render')
  .parse()

const arg1 = args["pathtobluemap's`1`directory"]
const arg2 = args['pathtooutputdirectory']

if (!arg1 || typeof arg1 !== 'string' || arg1.length === 0) {
  console.error('Invalid input directory')
  process.exit(1)
}

if (!arg2 || typeof arg2 !== 'string' || arg2.length === 0) {
  console.error('Invalid input directory')
  process.exit(1)
}

const inputDirectory = path.resolve(arg1)
const outputDirectory = path.resolve(arg2)

let filePaths = await glob(
  path.resolve(inputDirectory, '__rendered', '**/*.png'),
)

const filenameRegex = /^x(-?\d+)z(-?\d+)\.png$/
const tiles: { x: number; z: number; imageData: Buffer }[] = []
if (filePaths.length === 0) {
  filePaths = await glob(path.resolve(inputDirectory, '**/*.png'))
  const fileNames = filePaths.map((fn) =>
    fn.substring(inputDirectory.length + 1),
  )
  if (fileNames.length === 0) {
    console.error('No files found')
    process.exit(1)
  }

  console.log('Rendering')
  console.time('Rendering')
  let i = 0
  for (const tilePath of fileNames) {
    const tileName = tilePath.replaceAll('/', '')
    if (!filenameRegex.test(tileName)) {
      console.warn('Skipped', tilePath)
      continue
    }
    const [, x, z] = tileName.match(filenameRegex)!
    const tileData = await loadImage(path.resolve(inputDirectory, tilePath))
    const imageData = await renderMapTile(tileData)
    tiles.push({ x: parseInt(x), z: parseInt(z), imageData })

    await fs.promises.mkdir(
      path.resolve(inputDirectory, '__rendered', path.dirname(tilePath)),
      {
        recursive: true,
      },
    )
    await fs.promises.writeFile(
      path.resolve(inputDirectory, '__rendered', tilePath),
      imageData,
    )
    console.log(
      ++i,
      'of',
      fileNames.length,
      'tiles rendered',
      Math.round((i / fileNames.length) * 100) + '%',
    )
  }
  console.timeEnd('Rendering')
} else {
  for (const tilePath of filePaths) {
    const tileName = tilePath
      .substring(path.resolve(inputDirectory, '__rendered').length + 1)
      .replaceAll('/', '')
    if (!filenameRegex.test(tileName)) {
      console.warn('Skipped', tilePath)
      continue
    }
    const [, x, z] = tileName.match(filenameRegex)!
    const imageData = await fs.promises.readFile(tilePath)
    tiles.push({ x: parseInt(x), z: parseInt(z), imageData })
  }
}

const tileSize = 501
const minX = Math.min(...tiles.map((t) => t.x))
const maxX = Math.max(...tiles.map((t) => t.x))
const minZ = Math.min(...tiles.map((t) => t.z))
const maxZ = Math.max(...tiles.map((t) => t.z))
const mapWidth = (maxX - minX + 1) * tileSize
const mapHeight = (maxZ - minZ + 1) * tileSize

console.time('Drawing')
const canvasMaxSize = Math.ceil(32767 / 2)
const canvasesX = Math.ceil(mapWidth / canvasMaxSize)
const canvasesZ = Math.ceil(mapHeight / canvasMaxSize)
const canvases = Array(canvasesX * canvasesZ)
  .fill(0)
  .map(() => {
    const mapCanvas = createCanvas(canvasMaxSize, canvasMaxSize)
    const mapCtx = mapCanvas.getContext('2d')
    return { mapCanvas, mapCtx, edited: false }
  })

const centerX = Math.abs(minX) * tileSize
const centerZ = Math.abs(minZ) * tileSize

for (const tile of tiles) {
  const { x, z, imageData } = tile
  const image = await loadImageCanvas(imageData)
  const tileX = centerX + x * tileSize
  const tileZ = centerZ + z * tileSize

  const canvasIndexX = Math.floor(tileX / canvasMaxSize)
  const canvasIndexZ = Math.floor(tileZ / canvasMaxSize)
  const canvasIndex = canvasIndexX + canvasIndexZ * canvasesX

  const canvasX = canvasIndexX * canvasMaxSize
  const canvasZ = canvasIndexZ * canvasMaxSize
  const relativeX = tileX - canvasX
  const relativeZ = tileZ - canvasZ

  const { mapCtx } = canvases[canvasIndex]
  mapCtx.drawImage(image, relativeX, relativeZ, tileSize, tileSize)
  canvases[canvasIndex].edited = true
}
console.timeEnd('Drawing')

console.log('Saving', canvases.length, 'canvases')
console.time('Saving')
await fs.promises.rm(outputDirectory, { recursive: true, force: true })
await fs.promises.mkdir(outputDirectory, { recursive: true })
await fs.promises.writeFile(
  path.resolve(outputDirectory, 'info.json'),
  JSON.stringify({
    createdAt: new Date().toISOString(),
    minX,
    maxX,
    minZ,
    maxZ,
    tileSize,
    mapWidth,
    mapHeight,
    mapPartSize: canvasMaxSize,
    canvasesCreated: canvases.length,
    canvasesInOneRow: canvasesX,
  }),
)
for (let i = 0; i < canvases.length; i++) {
  const { mapCanvas, edited } = canvases[i]
  if (!edited) {
    continue
  }
  const filename = path.resolve(outputDirectory, `output-${i + 1}.png`)
  console.log('Saving', i / canvases.length, 'map part')

  const out = fs.createWriteStream(filename)
  const stream = mapCanvas.createPNGStream()
  const promise = new Promise<void>((resolve) => {
    out.on('finish', resolve)
  })

  stream.pipe(out)
  await promise
}
console.timeEnd('Saving')
