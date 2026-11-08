import {
  GRID,
  type ComposedPage,
  flow,
  partPages,
  readingPage,
  sectionPages,
  sourceGroups,
} from './compose';
import { METHOD, PARTS, SOURCES, STANDING, type Part } from './article';
import { DIAGRAMS } from './diagrams';

/**
 * The book plan: front matter, six essay parts, ten exhibit plates, apparatus.
 *
 * Every page gets a folio and a running head here, so nothing downstream has to
 * invent furniture. Diagrams are interleaved at the point of argument they
 * support; each is followed by its measured reading page.
 */

export interface BookPage extends ComposedPage {
  /** Running head, left. */
  section: string;
  /** Running head, right. */
  strap: string;
}

/** Which plates belong to which part of the argument. */
export const PLATE_PLAN: Record<string, string[]> = {
  event: ['timeline'],
  core: ['hub', 'rings'],
  miller: ['quadrant', 'org', 'flows', 'tenure'],
  money: ['barrels', 'influence'],
  filter: ['exits'],
  future: [],
};

const diagramById = (id: string) => {
  const d = DIAGRAMS.find((x) => x.id === id);
  if (!d) throw new Error(`no diagram ${id}`);
  return d;
};

const platePage = (id: string): BookPage => {
  const d = diagramById(id);
  return {
    frame: { kind: 'plate', partIndex: 0, pageNo: 0, columns: 2, top: 168, bottom: GRID.bottom },
    cols: [[], []],
    section: 'PLATES',
    strap: `FIG. ${d.numeral} · ${d.title.toUpperCase()}`,
  };
};

export interface Book {
  pages: BookPage[];
  /** Folio for each plate, for the contents page. */
  plateFolios: Record<string, number>;
  partFolios: Record<string, number>;
}

export const buildBook = (): Book => {
  const pages: BookPage[] = [];
  const plateFolios: Record<string, number> = {};
  const partFolios: Record<string, number> = {};

  // ── cover ────────────────────────────────────────────────────────────────
  pages.push({
    frame: { kind: 'cover', partIndex: 0, pageNo: 1, columns: 1, top: 200, bottom: GRID.bottom },
    cols: [[]],
    section: '',
    strap: '',
  });

  // ── contents ─────────────────────────────────────────────────────────────
  pages.push({
    frame: { kind: 'contents', partIndex: 0, pageNo: 2, columns: 1, top: 200, bottom: GRID.bottom },
    cols: [[]],
    section: 'CONTENTS',
    strap: STANDING.edition.toUpperCase(),
  });

  // ── method ───────────────────────────────────────────────────────────────
  const method = sectionPages(METHOD, pages.length + 1, 'method', 300);
  method.forEach((p) =>
    pages.push({ ...p, section: 'METHOD', strap: 'HOW TO READ THIS BOOK' }),
  );

  // ── parts, each followed by its plates ───────────────────────────────────
  PARTS.forEach((part: Part, pi) => {
    const composed = partPages(part, pages.length + 1, pi);
    composed.forEach((p, i) => {
      if (i === 0) partFolios[part.id] = p.frame.pageNo;
      pages.push({
        ...p,
        section: `${part.numeral} · ${part.title.toUpperCase()}`,
        strap: i === 0 ? 'PART OPENING' : part.title.toUpperCase(),
      });
    });

    (PLATE_PLAN[part.id] ?? []).forEach((id) => {
      const d = diagramById(id);
      const plate = platePage(id);
      plate.frame.pageNo = pages.length + 1;
      plateFolios[id] = plate.frame.pageNo;
      plate.section = `${part.numeral} · ${part.title.toUpperCase()}`;
      plate.strap = `FIG. ${d.numeral} · ${d.title.toUpperCase()}`;
      pages.push(plate);

      const reading = readingPage({ reading: d.reading, source: d.source }, pages.length + 1, 236);
      pages.push({
        ...reading,
        section: `${part.numeral} · ${part.title.toUpperCase()}`,
        strap: `FIG. ${d.numeral} · ${d.title.toUpperCase()}`,
      });
    });
  });

  // ── sources ──────────────────────────────────────────────────────────────
  const sources = flow(sourceGroups(SOURCES, GRID.colW), {
    startPage: pages.length + 1,
    columns: 2,
    colW: GRID.colW,
    frame: (i) => ({
      kind: i === 0 ? 'sources' : 'partCont',
      partIndex: 0,
      columns: 2,
      top: i === 0 ? 300 : 168,
      bottom: GRID.bottom,
    }),
  });
  sources.forEach((p, i) =>
    pages.push({ ...p, section: 'APPARATUS', strap: i === 0 ? 'SOURCES' : 'SOURCES, CONTINUED' }),
  );

  // ── colophon ─────────────────────────────────────────────────────────────
  pages.push({
    frame: { kind: 'colophon', partIndex: 0, pageNo: pages.length + 1, columns: 1, top: 260, bottom: GRID.bottom },
    cols: [[]],
    section: 'APPARATUS',
    strap: 'COLOPHON',
  });

  return { pages, plateFolios, partFolios };
};
