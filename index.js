import fs from 'fs'
import { PNG } from 'pngjs'
import { createCanvas } from 'canvas'
import createREGL from 'regl'
import gl from 'gl'

const loadImage = (path) => {
  return new Promise((resolve, reject) => {
    fs.createReadStream(path)
      .pipe(new PNG())
      .on('parsed', function () {
        resolve(this)
      })
      .on('error', reject)
  })
}

const fragmentShader = `
precision mediump float;

uniform sampler2D flatMap;
uniform sampler2D bumpMap;
uniform vec2 textureSize;
varying vec2 vUV;

void main() {
  vec4 color = texture2D(flatMap, vUV);
  float bump = texture2D(bumpMap, vUV).b; // Using blue channel as height
  float shadow = 1.0 - bump * 0.5; // Simulated ambient occlusion effect
  gl_FragColor = vec4(color.rgb * shadow, color.a);
}`

async function processImage(inputPath, outputPath) {
  const image = await loadImage(inputPath)
  const width = image.width
  const halfHeight = image.height / 2

  const flatMapData = new Uint8Array(width * halfHeight * 4)
  const bumpMapData = new Uint8Array(width * halfHeight * 4)

  for (let y = 0; y < halfHeight; y++) {
    for (let x = 0; x < width; x++) {
      const flatIdx = (y * width + x) * 4
      const bumpIdx = ((y + halfHeight) * width + x) * 4

      flatMapData.set(image.data.subarray(flatIdx, flatIdx + 4), flatIdx)
      bumpMapData.set(image.data.subarray(bumpIdx, bumpIdx + 4), flatIdx)
    }
  }

  const canvas = createCanvas(width, halfHeight)
  const regl = createREGL({
    gl: gl(width, halfHeight, { preserveDrawingBuffer: true })
  })

  const drawScene = regl({
    frag: fragmentShader,
    vert: `
      precision mediump float;
      attribute vec2 position;
      varying vec2 vUV;
      void main() {
        vUV = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0, 1);
      }
    `,
    attributes: {
      position: [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]]
    },
    uniforms: {
      flatMap: regl.texture({ data: flatMapData, width, height: halfHeight }),
      bumpMap: regl.texture({ data: bumpMapData, width, height: halfHeight }),
      textureSize: [width, halfHeight]
    },
    count: 6
  })

  regl.clear({ color: [0, 0, 0, 1] })
  drawScene()

  const pixels = new Uint8Array(width * halfHeight * 4)
  regl.read(pixels)

  const png = new PNG({ width, height: halfHeight })
  png.data = Buffer.from(pixels)
  png.pack().pipe(fs.createWriteStream(outputPath))

  console.log(`Image saved to ${outputPath}`)
}

processImage('input.png', 'output.png')