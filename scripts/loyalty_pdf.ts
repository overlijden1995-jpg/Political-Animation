/**
 * Print edition: the exhibit book as a PDF.
 *
 * The pages are rasterised from the same React tree the player projects and then
 * embedded losslessly (deflated RGB) into a hand-written PDF — one 1600 × 900
 * page per sheet, no reflow, no browser print dialog involved.
 *
 *   npx tsx scripts/loyalty_pdf.ts            → out/loyalty-book.pdf
 *   npx tsx scripts/loyalty_pdf.ts --scale 2  → 3200 × 1800 for press proofs
 */

import * as React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { renderToStaticMarkup } from 'react-dom/server';
import { Resvg } from '@resvg/resvg-js';
import { buildBook } from '../src/loyalty/book';
import { renderPage, setTotalPages } from '../src/loyalty/render';
import { STAGE } from '../src/loyalty/compose';

const ROOT = process.cwd();
const FONTS = path.join(ROOT, 'public', 'bad-actors', 'fonts');
const OUT = path.join(ROOT, 'out', 'loyalty-book.pdf');

const fontFiles = fs.readdirSync(FONTS).filter((f) => f.endsWith('.ttf')).map((f) => path.join(FONTS, f));

const argScale = (() => {
  const i = process.argv.indexOf('--scale');
  return i > -1 ? Math.max(1, Math.min(2, Number(process.argv[i + 1]) || 1)) : 1;
})();

const book = buildBook();
const total = book.pages.length;
setTotalPages(total);

const svgFor = (index: number): string => {
  const page = book.pages[index];
  const body = renderToStaticMarkup(
    React.createElement(
      'svg',
      { xmlns: 'http://www.w3.org/2000/svg', viewBox: `0 0 ${STAGE.w} ${STAGE.h}`, width: STAGE.w, height: STAGE.h },
      renderPage(page, book, total),
    ),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n${body}`;
};

// ── minimal PNG decode → RGB ────────────────────────────────────────────────

interface Bitmap {
  width: number;
  height: number;
  rgb: Buffer;
}

const decodePng = (png: Buffer): Bitmap => {
  let off = 8;
  let width = 0;
  let height = 0;
  let colorType = 6;
  let bitDepth = 8;
  const idat: Buffer[] = [];

  while (off < png.length) {
    const len = png.readUInt32BE(off);
    const type = png.toString('ascii', off + 4, off + 8);
    const data = png.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    off += 12 + len;
  }
  if (bitDepth !== 8) throw new Error('expected 8-bit PNG');

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (!channels) throw new Error(`unsupported PNG colour type ${colorType}`);

  const stride = width * channels;
  const out = Buffer.alloc(width * height * 3);
  const prev = Buffer.alloc(stride);
  let cur = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    const filter = raw[rowStart];
    raw.copy(cur, 0, rowStart + 1, rowStart + 1 + stride);
    for (let i = 0; i < stride; i += 1) {
      const a = i >= channels ? cur[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      switch (filter) {
        case 1:
          cur[i] = (cur[i] + a) & 0xff;
          break;
        case 2:
          cur[i] = (cur[i] + b) & 0xff;
          break;
        case 3:
          cur[i] = (cur[i] + ((a + b) >> 1)) & 0xff;
          break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          cur[i] = (cur[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
          break;
        }
        default:
          break;
      }
    }
    // composite over the paper stock, so the PDF never needs an alpha mask
    for (let x = 0; x < width; x += 1) {
      const s = x * channels;
      const d = (y * width + x) * 3;
      if (channels === 4) {
        const a = cur[s + 3] / 255;
        if (a >= 1) {
          out[d] = cur[s];
          out[d + 1] = cur[s + 1];
          out[d + 2] = cur[s + 2];
        } else {
          out[d] = Math.round(cur[s] * a + 0xf6 * (1 - a));
          out[d + 1] = Math.round(cur[s + 1] * a + 0xf4 * (1 - a));
          out[d + 2] = Math.round(cur[s + 2] * a + 0xee * (1 - a));
        }
      } else {
        out[d] = cur[s];
        out[d + 1] = cur[s + 1];
        out[d + 2] = cur[s + 2];
      }
    }
    cur.copy(prev);
  }
  return { width, height, rgb: out };
};

// ── PDF writer ──────────────────────────────────────────────────────────────

const W = STAGE.w * argScale;
const H = STAGE.h * argScale;

const chunks: Buffer[] = [];
let cursor = 0;
const offsets: number[] = [];
const push = (b: Buffer | string) => {
  const buf = typeof b === 'string' ? Buffer.from(b, 'latin1') : b;
  chunks.push(buf);
  cursor += buf.length;
};
const objMark = (n: number) => {
  offsets[n] = cursor;
};

const pageCount = total;
/*
 * Object plan — every number handed out up front, because the xref table has to
 * name one contiguous run:
 *   1 catalog · 2 page tree · 3 font
 *   4 .. 3+3N      per page: image XObject, page dict, content stream
 *   4+3N           document information
 */
const imageObj = (i: number) => 4 + i * 3;
const pageObj = (i: number) => 5 + i * 3;
const contentObj = (i: number) => 6 + i * 3;
const infoObj = 4 + pageCount * 3;
const objectCount = infoObj; // highest object number in the table

push('%PDF-1.5\n%\xE2\xE3\xCF\xD3\n');

objMark(1);
push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

objMark(2);
const kids = Array.from({ length: pageCount }, (_, i) => `${pageObj(i)} 0 R`).join(' ');
push(`2 0 obj\n<< /Type /Pages /Count ${pageCount} /Kids [${kids}] >>\nendobj\n`);

objMark(3);
push('3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

for (let i = 0; i < pageCount; i += 1) {
  const svg = svgFor(i);
  const png = Buffer.from(
    new Resvg(svg, {
      font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Plus Jakarta Sans' },
      fitTo: { mode: 'width', value: W },
      background: '#F6F4EE',
    })
      .render()
      .asPng(),
  );
  const bmp = decodePng(png);
  if (bmp.width !== W || bmp.height !== H) throw new Error(`page ${i + 1}: unexpected bitmap ${bmp.width}×${bmp.height}`);
  const deflated = zlib.deflateSync(bmp.rgb, { level: 9 });

  objMark(imageObj(i));
  push(
    `${imageObj(i)} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${bmp.width} /Height ${bmp.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${deflated.length} >>\nstream\n`,
  );
  push(deflated);
  push('\nendstream\nendobj\n');

  const content = `q\n${W} 0 0 ${H} 0 0 cm\n/Im0 Do\nQ\n`;
  objMark(pageObj(i));
  push(
    `${pageObj(i)} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${imageObj(i)} 0 R >> /Font << /F1 3 0 R >> >> /Contents ${contentObj(i)} 0 R >>\nendobj\n`,
  );

  objMark(contentObj(i));
  push(`${contentObj(i)} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);

  process.stdout.write(`\r  rendered ${i + 1}/${pageCount}`);
}
process.stdout.write('\n');

// ── metadata + xref ────────────────────────────────────────────────────────

objMark(infoObj);
push(
  `${infoObj} 0 obj\n<< /Title (The Loyalty Machine) /Author (Bad Actors research series) /Subject (A link analysis of Donald Trump, his court and his business allies, 2024-2026) /Creator (Swiss Broadsheet press) /Producer (measured SVG compositor) >>\nendobj\n`,
);

const xrefStart = cursor;
let xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
for (let n = 1; n <= objectCount; n += 1) {
  xref += `${String(offsets[n] ?? 0).padStart(10, '0')} 00000 n \n`;
}
push(xref);
push(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R /Info ${infoObj} 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, Buffer.concat(chunks));
const mb = (fs.statSync(OUT).size / 1024 / 1024).toFixed(1);
console.log(`▸ ${path.relative(ROOT, OUT)} · ${pageCount} pages · ${W}×${H} · ${mb} MB`);
