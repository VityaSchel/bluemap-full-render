# bluemap-full-render

## Usage

1. Clone repository
2. Install [nvm.sh](https://nvm.sh)
3. Execute `nvm use` (node.js v20.13.1 should be installed, confirm with `node -v`)
4. Execute `npm install` (check requirements here: [headless-gl](https://github.com/stackgl/headless-gl?tab=readme-ov-file#system-dependencies))
5. Execute `npm run build`
6. Download `/bluemap/web/maps/overworld/tiles/1` to some folder and rename to `bluemap-[date]`
7. Execute `node out/index.js ./path/to/bluemap-[date] ./my-output-directory` where first argument is path to the folder you downloaded in step 6 and second argument is path to the output directory

This will output map parts with resolution 1:1 block and size of 16384х16384 pixels that you can stitch together to get a final ultra big map.

## Bluemap API

For reference only, not needed to run this program

https://map.yourserver.com/maps/overworld/tiles/[zoom level]

Bluemap can't count to 10. Only 0 to 9 both ends included.

`/x[actual X tile index from 0 to 9]/z[actual Z tile index from 0 to 9].png`

If we need to go further:

`/x[first digit from 0 to 9]/[second digit from 9 to 0]/z[actual Z tile index from 0 to 9].png`

Another example:

`/x[X tile index 0 to 9]/z[first digit from 0 to 9]/[second digit from 0 to 9].png`

Zoom level 0 = json files for rendering in threejs
Zoom level 1 = 1:1 (1 block = 1 pixel)
Zoom level 2 = 4:1 (4 blocks = 1 pixel)
Zoom level 3 = about 20:1 (20 blocks = 1 pixel) (?)

