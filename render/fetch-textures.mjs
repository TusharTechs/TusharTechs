// Downloads the Earth and Moon textures used by the renders (from the three.js
// examples, originally NASA Blue Marble / Black Marble imagery).
import fs from 'node:fs';
const BASE = 'https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/textures/planets/';
const FILES = ['earth_atmos_2048.jpg', 'earth_normal_2048.jpg', 'earth_specular_2048.jpg',
  'earth_clouds_1024.png', 'earth_lights_2048.png', 'moon_1024.jpg'];
fs.mkdirSync(new URL('./textures/', import.meta.url), { recursive: true });
for (const f of FILES) {
  const dest = new URL('./textures/' + f, import.meta.url);
  if (fs.existsSync(dest)) continue;
  const res = await fetch(BASE + f);
  if (!res.ok) throw new Error(`${f}: HTTP ${res.status}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  console.log('fetched', f);
}
