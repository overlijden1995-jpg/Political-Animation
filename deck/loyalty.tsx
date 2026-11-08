import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { buildBook } from '../src/loyalty/book';
import { renderPage, setTotalPages } from '../src/loyalty/render';
import { STAGE } from '../src/loyalty/compose';
import { DIAGRAMS } from '../src/loyalty/diagrams';
import { STANDING } from '../src/loyalty/article';
import { loadDeckFonts } from '../src/slides/fonts';
import './loyalty.css';

/**
 * The projector.
 *
 * One page on screen at a time, drawn as a single SVG. The page is a pure
 * function of (book, index), so what is projected here is exactly what the
 * headless proofs and any exported PDF contain — the browser never re-lays-out
 * a line of type.
 */

const book = buildBook();
const total = book.pages.length;
setTotalPages(total);

const PLATES = Object.fromEntries(DIAGRAMS.map((d) => [d.numeral, d.id]));

const readHash = (): number => {
  const m = /p=(\d+)/.exec(window.location.hash);
  const n = m ? Number(m[1]) : 1;
  return Math.min(Math.max(n, 1), total);
};

const App: React.FC = () => {
  const [index, setIndex] = React.useState(readHash() - 1);
  const [chrome, setChrome] = React.useState(true);
  const [overview, setOverview] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const idle = React.useRef<number | null>(null);
  const stageRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    void loadDeckFonts().then(() => setReady(true));
  }, []);

  const go = React.useCallback((n: number) => {
    setIndex((cur) => {
      const next = Math.min(Math.max(n, 0), total - 1);
      if (next !== cur) window.history.replaceState(null, '', `#p=${next + 1}`);
      return next;
    });
  }, []);

  const poke = React.useCallback(() => {
    setChrome(true);
    if (idle.current) window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => setChrome(false), 2600);
  }, []);

  React.useEffect(() => {
    poke();
    return () => {
      if (idle.current) window.clearTimeout(idle.current);
    };
  }, [poke]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        go(index + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        go(index - 1);
      } else if (e.key === 'Home') {
        go(0);
      } else if (e.key === 'End') {
        go(total - 1);
      } else if (e.key === 'f') {
        const el = document.documentElement;
        if (document.fullscreenElement) void document.exitFullscreen();
        else void el.requestFullscreen();
      } else if (e.key === 'g') {
        setOverview((v) => !v);
      } else if (e.key === 'Escape') {
        setOverview(false);
      }
      poke();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index, poke]);

  const page = book.pages[index];

  return (
    <div className={`loy ${chrome ? 'chrome' : 'still'} ${overview ? 'overview' : ''}`} onMouseMove={poke} onClick={poke}>
      <div className="loy-stage" ref={stageRef}>
        <svg
          key={index}
          viewBox={`0 0 ${STAGE.w} ${STAGE.h}`}
          preserveAspectRatio="xMidYMid meet"
          className="loy-page"
          style={{ opacity: ready ? 1 : 0 }}
        >
          {renderPage(page, book, total)}
        </svg>
        <div className="loy-hot loy-hot-l" onClick={() => go(index - 1)} aria-hidden />
        <div className="loy-hot loy-hot-r" onClick={() => go(index + 1)} aria-hidden />
      </div>

      {overview ? (
        <div className="loy-grid">
          {book.pages.map((p, i) => {
            const plate = /FIG\. (\d\d)/.exec(p.strap);
            const isPlate = p.frame.kind === 'reading' && !!plate;
            return (
              <button
                key={p.frame.pageNo}
                className={`loy-thumb ${i === index ? 'on' : ''} ${isPlate ? 'plate' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  go(i);
                  setOverview(false);
                }}
              >
                <span className="loy-thumb-no">{String(p.frame.pageNo).padStart(2, '0')}</span>
                <span className="loy-thumb-t">{isPlate ? `FIG ${plate?.[1]} · ${DIAGRAMS.find((d) => d.numeral === plate?.[1])?.title ?? ''}` : p.section || p.frame.kind}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <header className="loy-top">
        <span className="loy-brand">{STANDING.title.toUpperCase()}</span>
        <span className="loy-sec">{page.section || 'COVER'}</span>
        <span className="loy-count">
          {String(index + 1).padStart(3, '0')} <i>/</i> {String(total).padStart(3, '0')}
        </span>
      </header>

      <footer className="loy-bot">
        <button onClick={() => go(0)} title="first page (Home)">
          ⏮
        </button>
        <button onClick={() => go(index - 1)} title="previous (←)">
          ◀
        </button>
        <button onClick={() => go(index + 1)} title="next (→)">
          ▶
        </button>
        <div className="loy-progress" onClick={(e) => e.stopPropagation()}>
          <input
            type="range"
            min={1}
            max={total}
            value={index + 1}
            onChange={(e) => go(Number(e.target.value) - 1)}
            aria-label="page"
          />
        </div>
        <button onClick={() => setOverview((v) => !v)} title="all pages (g)">
          ⊞
        </button>
        <button
          onClick={() => {
            const el = document.documentElement;
            if (document.fullscreenElement) void document.exitFullscreen();
            else void el.requestFullscreen();
          }}
          title="fullscreen (f)"
        >
          ⛶
        </button>
        <a className="loy-print" href="/out/loyalty-book.pdf" target="_blank" rel="noreferrer" title="print edition (PDF)">
          PRINT EDITION
        </a>
      </footer>
    </div>
  );
};

const mount = document.getElementById('root');
if (mount) createRoot(mount).render(<App />);

export { PLATES };
