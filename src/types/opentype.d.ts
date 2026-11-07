// Minimal surface of opentype.js used by the build-side deck tools.
declare module 'opentype.js' {
  export interface Glyph {
    advanceWidth?: number;
    name?: string;
  }
  export interface Font {
    unitsPerEm: number;
    charToGlyph(char: string): Glyph;
    getAdvanceWidth(text: string, fontSize?: number, options?: { kerning?: boolean }): number;
  }
  export function parse(buffer: ArrayBuffer): Font;
  const opentype: { parse: typeof parse };
  export default opentype;
}
