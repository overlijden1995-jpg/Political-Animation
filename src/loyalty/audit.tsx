import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { width } from './measure';

/**
 * Text-overlap audit.
 *
 * The compositor places every baseline by hand, so a collision is always a
 * placing bug rather than a browser quirk. This walks the rendered markup of a
 * page, measures each text run's box from its real advances, and reports any
 * two boxes that intersect — the check that a person reading a proof would make
 * at 400 per cent, made every build instead.
 */

interface Box {
  id: number;
  text: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  size: number;
}

const DECOR = /^[·•—–\-|/]$/;

let debugLeft = Number(process.env.AUDIT_DEBUG ?? 0);

const boxesFor = (markup: string): Box[] => {
  const out: Box[] = [];
  const re = /<text([^>]*)>([\s\S]*?)<\/text>/g;
  let m: RegExpExecArray | null;
  let id = 0;
  while ((m = re.exec(markup))) {
    const attrs = m[1];
    const raw = m[2]
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&nbsp;/g, ' ');
    const text = raw.replace(/\s+/g, ' ').trim();
    if (!text || DECOR.test(text)) continue;

    // markup may be camelCase (React tree) or kebab-case (serialised SVG)
    const num = (name: string, dflt = NaN): number => {
      const kebab = name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
      const r = new RegExp(`(?:${name}|${kebab})="([^"]+)"`).exec(attrs);
      return r ? Number(r[1]) : dflt;
    };
    const str = (name: string): string => {
      const kebab = name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
      const r = new RegExp(`(?:${name}|${kebab})="([^"]*)"`).exec(attrs);
      return r ? r[1] : '';
    };

    const x = num('x');
    const y = num('y');
    const size = num('fontSize', 12);
    if (!Number.isFinite(x) || !Number.isFinite(y) || attrs.includes('transform')) continue;

    const family = str('fontFamily').replace(/&quot;/g, '"');
    const spacing = num('letterSpacing', 0) || 0;
    let w = 0;
    try {
      w = width(text, family, size, spacing);
    } catch {
      continue;
    }
    const anchor = str('textAnchor');
    const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;

    // cap height above the baseline, descender below
    out.push({ id: id++, text, x0, x1: x0 + w, y0: y - size * 0.74, y1: y + size * 0.22, size });
  }
  return out;
};

export interface AuditOptions {
  /** count an intersection only above this depth, so stacked hairlines are fine */
  minOverlap?: number;
}

export const auditText = (markup: string, label: string, opts: AuditOptions = {}): string[] => {
  const minOverlap = opts.minOverlap ?? 1.2;
  const boxes = boxesFor(markup);
  if (process.env.AUDIT_DUMP) boxes.forEach((b) => console.log(`${label} ${b.id} [${b.x0.toFixed(0)}..${b.x1.toFixed(0)}] y${b.y0.toFixed(0)}..${b.y1.toFixed(0)} “${b.text.slice(0, 40)}”`));
  const hits: string[] = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
      const oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (ox > 1.2 && oy > minOverlap) {
        if (debugLeft > 0) {
          debugLeft -= 1;
          console.log(`  box ${JSON.stringify(a)}`, JSON.stringify(b));
        }
        hits.push(
          `${label}: “${a.text.slice(0, 34)}” ${a.x0.toFixed(0)},${a.y0.toFixed(0)} ↔ “${b.text.slice(0, 34)}” ${b.x0.toFixed(0)},${b.y0.toFixed(0)} (${ox.toFixed(1)}×${oy.toFixed(1)})`,
        );
      }
    }
  }
  return hits;
};

export const markupOf = (node: React.ReactElement): string => renderToStaticMarkup(node);
