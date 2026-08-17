// Reduce el peso de los iconos de bebidas (assets/drinks) y las fotos de
// bar por defecto (assets/bars) sin perder calidad visible: son íconos e
// imágenes pequeñas en pantalla, pero se guardaron a una resolución mucho
// mayor de la necesaria. Recomprime todo en el sitio (mismo nombre de
// archivo), así que ejecútalo cada vez que añadas imágenes nuevas a esas
// carpetas — no hace falta tocar el código para que se apliquen.
//
// Uso: node scripts/compress-images.mjs
import { readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const TARGETS = [
  // Iconos de bebidas: dibujos con transparencia, se pintan pequeños
  // (nunca más de ~150dp) — 320px de lado más largo es de sobra incluso
  // en pantallas de alta densidad.
  { dir: 'assets/drinks', maxSize: 320, kind: 'png' },
  // Fotos de bar por defecto: se ven en una rejilla de miniaturas — 500px
  // sobra de largo.
  { dir: 'assets/bars', maxSize: 500, kind: 'jpg' },
];

async function compressPng(path, maxSize) {
  const buffer = await sharp(path)
    .resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
    .png({ quality: 80, compressionLevel: 9, palette: true })
    .toBuffer();
  return buffer;
}

async function compressJpg(path, maxSize) {
  const buffer = await sharp(path)
    .resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();
  return buffer;
}

async function run() {
  let totalBefore = 0;
  let totalAfter = 0;

  for (const { dir, maxSize, kind } of TARGETS) {
    const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(`.${kind}`));
    for (const file of files) {
      const path = join(dir, file);
      const before = statSync(path).size;
      const compressed = kind === 'png' ? await compressPng(path, maxSize) : await compressJpg(path, maxSize);

      // Solo sobrescribimos si de verdad hemos ganado tamaño (por si algún
      // archivo ya viniera bien optimizado). Escribimos a un .tmp y hacemos
      // rename en vez de sobrescribir el archivo directamente — en Windows,
      // escribir sobre el mismo path que acabas de leer con sharp a veces
      // falla con EUNKNOWN por un bloqueo del handle de lectura que tarda
      // en soltarse; el rename sí funciona siempre.
      if (compressed.length < before) {
        const tmpPath = `${path}.tmp`;
        writeFileSync(tmpPath, compressed);
        renameSync(tmpPath, path);
        totalAfter += compressed.length;
      } else {
        totalAfter += before;
      }
      totalBefore += before;
    }
  }

  console.log(`Antes:   ${(totalBefore / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Después: ${(totalAfter / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Ahorro:  ${(((totalBefore - totalAfter) / totalBefore) * 100).toFixed(1)}%`);
}

run();
