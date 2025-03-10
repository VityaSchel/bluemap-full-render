# bluemap-full-render

Bluemap API:

https://map.demovio.lol/maps/overworld/tiles/[zoom level]

Bluemap can't count to 10. Only 0 to 9 both ends included.

/x[actual X tile index from 0 to 9]/z[actual Z tile index from 0 to 9].png

If we need to go further:

/x[first digit from 0 to 9]/[second digit from 9 to 0]/z[actual Z tile index from 0 to 9].png

Another example:

/x[X tile index 0 to 9]/z[first digit from 0 to 9]/[second digit from 0 to 9].png

Zoom level 0 = json files for rendering in threejs
Zoom level 1 = 1:1 (1 block = 1 pixel)
Zoom level 2 = 4:1 (4 blocks = 1 pixel)
Zoom level 3 = about 20:1 (20 blocks = 1 pixel) (?)

