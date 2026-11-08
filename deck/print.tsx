import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { buildBook } from '../src/loyalty/book';
import { renderPage, setTotalPages } from '../src/loyalty/render';
import { STAGE } from '../src/loyalty/compose';
import { loadDeckFonts } from '../src/slides/fonts';

/**
 * Print edition.
 *
 * Every page of the book on one scrollable sheet, one page per printed page at
 * exactly 1600 × 900. Browsers' "save as PDF" then produces the book at the
 * geometry the compositor measured — no reflow, no rescaling, no orphaned lines.
 */

const book = buildBook();
const total = book.pages.length;
setTotalPages(total);

const Pages: React.FC = () => {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    void loadDeckFonts().then(() => setReady(true));
  }, []);

  return (
    <div style={{ opacity: ready ? 1 : 0, transition: 'opacity 200ms linear' }}>
      {book.pages.map((page) => (
        <div className="sheet" key={page.frame.pageNo}>
          <svg viewBox={`0 0 ${STAGE.w} ${STAGE.h}`} width={STAGE.w} height={STAGE.h} xmlns="http://www.w3.org/2000/svg">
            {renderPage(page, book, total)}
          </svg>
        </div>
      ))}
    </div>
  );
};

const mount = document.getElementById('pages');
if (mount) {
  mount.innerHTML = '';
  createRoot(mount).render(<Pages />);
}
