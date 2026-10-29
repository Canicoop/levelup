// Generates the app icons in public/ from the SVG sources. Run with `npm run icons`
// after changing a source; the output is deterministic, so a second run changes nothing.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { Resvg } from '@resvg/resvg-js'

const root = join(import.meta.dirname, '..')
const sources = join(root, 'assets', 'icons')
const output = join(root, 'public')

const pngs = [
  { source: join(sources, 'icon-square.svg'), file: 'apple-touch-icon.png', size: 180 },
  { source: join(sources, 'icon.svg'), file: 'icon-192.png', size: 192 },
  { source: join(sources, 'icon.svg'), file: 'icon-512.png', size: 512 },
  { source: join(sources, 'icon-maskable.svg'), file: 'icon-maskable-512.png', size: 512 },
]

function renderPng(svgPath: string, size: number) {
  const resvg = new Resvg(readFileSync(svgPath), {
    fitTo: { mode: 'width', value: size },
    // The icons have no text, so system fonts are not needed.
    font: { loadSystemFonts: false },
  })
  return resvg.render().asPng()
}

// An ICO file with a single PNG image inside, which every current browser supports.
// Layout: 6-byte header, one 16-byte directory entry, then the PNG data.
function pngToIco(png: Buffer, size: number) {
  const header = Buffer.alloc(22)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(1, 4) // number of images
  header.writeUInt8(size, 6) // width
  header.writeUInt8(size, 7) // height
  header.writeUInt8(0, 8) // palette size: none
  header.writeUInt8(0, 9) // reserved
  header.writeUInt16LE(1, 10) // colour planes
  header.writeUInt16LE(32, 12) // bits per pixel
  header.writeUInt32LE(png.length, 14) // image size
  header.writeUInt32LE(header.length, 18) // image offset
  return Buffer.concat([header, png])
}

for (const { source, file, size } of pngs) {
  writeFileSync(join(output, file), renderPng(source, size))
  console.log(`${file} (${size}×${size})`)
}

writeFileSync(join(output, 'favicon.ico'), pngToIco(renderPng(join(output, 'favicon.svg'), 32), 32))
console.log('favicon.ico (32×32)')
