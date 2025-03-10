import fs from 'fs'
import { PNG } from 'pngjs'

export const loadImage = (path: string) => {
  return new Promise<PNG>((resolve, reject) => {
    fs.createReadStream(path)
      .pipe(new PNG())
      .on('parsed', function () {
        resolve(this)
      })
      .on('error', reject)
  })
}
