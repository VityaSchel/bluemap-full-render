import fs from 'fs';
import { PNG } from 'pngjs';
import { createCanvas } from 'canvas';
import createREGL from 'regl';
import gl from 'gl';

const loadImage = (path) => {
  return new Promise((resolve, reject) => {
    fs.createReadStream(path)
      .pipe(new PNG())
      .on('parsed', function () {
        resolve(this);
      })
      .on('error', reject);
  });
};

const fragmentShader = `
precision mediump float;

uniform sampler2D textureImage;
uniform vec2 textureSize;
varying vec2 vUV;

float metaToHeight(vec4 meta) {
  float heightUnsigned = meta.g * 65280.0 + meta.b * 255.0;
  if (heightUnsigned >= 32768.0) {
    return -(65535.0 - heightUnsigned);
  } else {
    return heightUnsigned;  
  }
}

void main() {
  vec2 colorUV = vec2(vUV.x, vUV.y * 0.5);
  vec2 bumpUV = vec2(vUV.x, vUV.y * 0.5 + 0.5);
  
  vec4 color = texture2D(textureImage, colorUV);
  vec4 meta = texture2D(textureImage, bumpUV);

  float height = metaToHeight(meta);
  float heightX = metaToHeight(texture2D(textureImage, bumpUV + vec2(1.0 / textureSize.x, 0.0)));
  float heightZ = metaToHeight(texture2D(textureImage, bumpUV + vec2(0.0, 1.0 / textureSize.y)));

  float heightDiff = ((height - heightX) + (height - heightZ)) * 0.06;
  float shade = clamp(heightDiff, -0.2, 0.04);

  color.rgb += shade;
  gl_FragColor = color;
}`;

async function processImage(inputPath, outputPath) {
  const image = await loadImage(inputPath);
  const { width, height } = image;

  const canvas = createCanvas(width, height / 2);
  const regl = createREGL({
    gl: gl(width, height / 2, { preserveDrawingBuffer: true }),
  });

  // Create texture with proper dimensions
  const texture = regl.texture({
    data: image.data,
    width: width,
    height: height,
    format: 'rgba',
  });

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
      position: [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]],
    },
    uniforms: {
      textureImage: texture,
      textureSize: [width, height], // Correct texture dimensions
    },
    count: 6,
  });

  regl.clear({ color: [0, 0, 0, 1] });
  drawScene();

  const pixels = new Uint8Array(width * (height / 2) * 4);
  regl.read(pixels);

  const png = new PNG({ width, height: height / 2 });
  png.data = Buffer.from(pixels);
  png.pack().pipe(fs.createWriteStream(outputPath));

  console.log(`Image saved to ${outputPath}`);
}

processImage('input.png', 'output.png');