import * as React from 'react';
import {
  pageAt,
  pageElapsed,
  formatTimecode,
  seasonLabel,
  type BumperPage as BumperPageModel,
  type ContentPage,
  type CoverPage as CoverPageModel,
  type DeckPage,
  type SlideDeck,
} from './deck';
import { assetUrl } from './fonts';
import { HEAD_TOP, TEXT_LIMITS, pageGeometry, type PageGeometry } from './layout';
import { browserMeasure } from './measure';
import { Copy, Fitted, Folio, Kicker, PhotoPlate, Rule, RunningHead, smartQuotes } from './parts';
import { CRISP_TEXT, GRID, HAIR, PRINT, STAGE, TYPE, sectionPrint } from './tokens';
import { useDeckFonts } from './useDeckFonts';
import type { BadActorsSlide } from '../agents/badActorsAgent';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

/** Hard, fast page-in. Identical on every page — no app-store easing. */
const enter = (elapsed: number, delay = 0, duration = 0.26): number =>
  easeOut((elapsed - delay) / duration);

export interface DeckStageProps {
  deck: SlideDeck;
  /** Seconds into the episode. */
  time: number;
  showCaptions?: boolean;
}

/* ------------------------------------------------------------------- stage */

/**
 * Hook-free canvas. Everything the deck paints lives here, which lets headless
 * tools (see `scripts/deck_still.ts`) expand the tree without a renderer.
 */
export const DeckCanvas: React.FC<DeckStageProps> = ({ deck, time, showCaptions = true }) => {
  const page = pageAt(deck, time);
  const elapsed = pageElapsed(page, time);

  return (
    <div
      style={{
        position: 'relative',
        width: STAGE.width,
        height: STAGE.height,
        overflow: 'hidden',
        background: PRINT.paper,
        color: PRINT.ink,
        fontFamily: TYPE.sans,
        ...CRISP_TEXT,
      }}
    >
      {page.kind === 'cover' && <CoverStage deck={deck} page={page} elapsed={elapsed} />}
      {page.kind === 'bumper' && <BumperStage deck={deck} page={page} elapsed={elapsed} />}
      {page.kind === 'content' && (
        <ContentStage deck={deck} page={page} time={time} elapsed={elapsed} showCaptions={showCaptions} />
      )}
    </div>
  );
};

/**
 * Shell that waits for the real typefaces before measuring.
 * In Remotion the same wait is enforced with `delayRender`.
 */
export const DeckStage: React.FC<DeckStageProps> = (props) => {
  useDeckFonts();
  return <DeckCanvas {...props} />;
};

/* ------------------------------------------------------------------- cover */

const CoverStage: React.FC<{ deck: SlideDeck; page: CoverPageModel; elapsed: number }> = ({
  deck,
  page,
  elapsed,
}) => {
  const { episode } = deck;
  const portrait = episode.slides[0].photo;

  return (
    <>
      <PhotoPlate
        src={assetUrl(portrait.src)}
        x={1272}
        y={0}
        width={648}
        height={STAGE.height}
        zoom={1 + 0.02 * clamp01(elapsed / 8)}
        priority
      />
      <Rule x={1272} y={0} width={HAIR} color={PRINT.ink} style={{ height: STAGE.height }} />

      <div style={{ position: 'absolute', left: 72, top: 96, width: 1120 }}>
        <Kicker size={15} color={PRINT.muted} letterSpacing={0.26}>
          The Politician Series · {seasonLabel(episode)}
        </Kicker>
      </div>

      <div style={{ position: 'absolute', left: 68, top: 126 }}>
        <Fitted
          text="Bad Actors"
          family={TYPE.numeral}
          weight={400}
          maxWidth={1120}
          maxLines={1}
          maxSize={172}
          minSize={90}
          lineHeight={0.92}
          letterSpacing={-0.002}
          progress={enter(elapsed, 0.02, 0.45)}
        />
      </div>

      <Rule x={72} y={332} width={520} thickness={6} color={PRINT.vermilion} />
      <div style={{ position: 'absolute', left: 72, top: 354 }}>
        <Fitted
          text="How Politicians Pretend"
          family={TYPE.display}
          weight={900}
          maxWidth={1080}
          maxLines={1}
          maxSize={54}
          minSize={30}
          lineHeight={1}
          progress={enter(elapsed, 0.1)}
        />
      </div>

      <div style={{ position: 'absolute', left: 72, top: 438, width: 1060 }}>
        <Fitted
          text={episode.subject ?? `Vice President ${episode.politician}`}
          family={TYPE.display}
          weight={900}
          maxWidth={1060}
          maxLines={2}
          maxSize={62}
          minSize={40}
          lineHeight={1.02}
          progress={enter(elapsed, 0.16)}
        />
      </div>

      <div style={{ position: 'absolute', left: 72, top: 594, width: 1000 }}>
        <Copy
          text={episode.coverLine ?? ''}
          size={25}
          maxWidth={1000}
          maxLines={3}
          color={PRINT.muted}
          lineHeight={1.42}
        />
      </div>

      {/* Contents block — print, not navigation. */}
      <div style={{ position: 'absolute', left: 72, top: 726, width: 1040 }}>
        <Rule x={0} y={0} width={1040} color={PRINT.hairMid} />
        {episode.sections.map((section, i) => {
          const rowP = enter(elapsed, 0.24 + i * 0.05);
          return (
            <div
              key={section.id}
              style={{
                position: 'absolute',
                left: 0,
                top: 16 + i * 32,
                width: 1040,
                display: 'flex',
                alignItems: 'baseline',
                opacity: rowP,
                transform: `translateX(${(1 - rowP) * 12}px)`,
              }}
            >
              <div
                style={{
                  width: 48,
                  fontFamily: TYPE.mono,
                  fontSize: 13,
                  color: sectionPrint(section.id).accent,
                  letterSpacing: '0.12em',
                  fontWeight: 700,
                }}
              >
                {section.number}
              </div>
              <div
                style={{
                  flex: 1,
                  fontFamily: TYPE.sans,
                  fontSize: 19,
                  fontWeight: 700,
                  color: PRINT.ink,
                  whiteSpace: 'nowrap',
                }}
              >
                {section.title}
              </div>
              <div
                style={{
                  fontFamily: TYPE.mono,
                  fontSize: 13,
                  color: PRINT.muted,
                  letterSpacing: '0.12em',
                }}
              >
                {formatTimecode(section.durationSeconds)}
              </div>
            </div>
          );
        })}
      </div>

      <Rule x={0} y={940} width={1272} color={PRINT.ink} />
      <div style={{ position: 'absolute', left: 72, top: 968 }}>
        <Kicker size={14} color={PRINT.inkSoft} letterSpacing={0.2} weight={700}>
          {episode.politician.toUpperCase()} · {episode.party.toUpperCase()} ·{' '}
          {formatTimecode(episode.durationSeconds)}
        </Kicker>
      </div>
      <Folio
        page={page.folio}
        total={deck.pages.length}
        color={PRINT.paper}
        muted="rgba(246,244,238,0.72)"
      />
    </>
  );
};

/* ------------------------------------------------------------------ bumper */

const BumperStage: React.FC<{ deck: SlideDeck; page: BumperPageModel; elapsed: number }> = ({
  deck,
  page,
  elapsed,
}) => {
  const ink = sectionPrint(page.section.id);
  const standfirst =
    deck.episode.slides.find((slide) => slide.sectionId === page.section.id)?.subheadline ?? '';
  const bg = page.section.id === 'conclusion' ? PRINT.ink : ink.accent;
  const fg = PRINT.paper;
  const p = enter(elapsed, 0, 0.42);

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, background: bg }} />
      <div style={{ position: 'absolute', left: 72, top: 96 }}>
        <Kicker size={15} color={fg} letterSpacing={0.28} style={{ opacity: 0.72 }}>
          {deck.episode.seriesTitle} · {seasonLabel(deck.episode)}
        </Kicker>
      </div>
      <div style={{ position: 'absolute', right: -70, top: 40, opacity: 0.16 }}>
        <div
          style={{
            fontFamily: TYPE.numeral,
            fontSize: 620,
            lineHeight: 0.78,
            color: fg,
            letterSpacing: '-0.03em',
          }}
        >
          {page.section.number}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 72, top: 552 }}>
        <Fitted
          text={page.section.title}
          family={TYPE.display}
          weight={900}
          maxWidth={1400}
          maxLines={2}
          maxSize={88}
          minSize={52}
          lineHeight={1.02}
          color={fg}
          progress={p}
        />
      </div>
      {standfirst && (
        <div
          style={{
            position: 'absolute',
            left: 72,
            top: 748,
            width: 1180,
            opacity: 0.78 * p,
            transform: `translateY(${(1 - p) * 8}px)`,
          }}
        >
          <Copy
            text={standfirst}
            size={23}
            maxWidth={1180}
            maxLines={2}
            color={fg}
            lineHeight={1.4}
          />
        </div>
      )}
      <Rule x={72} y={852} width={1400} thickness={3} color={fg} opacity={0.5} />
      <div style={{ position: 'absolute', left: 72, top: 880 }}>
        <Kicker size={16} color={fg} letterSpacing={0.22} weight={700}>
          Section {page.section.number} · {formatTimecode(page.section.durationSeconds)} of analysis
        </Kicker>
      </div>
      <div style={{ position: 'absolute', left: 0, top: 966, width: 1848, textAlign: 'right' }}>
        <span style={{ fontFamily: TYPE.numeral, fontSize: 34, color: fg, opacity: 0.9 }}>
          {String(page.folio).padStart(2, '0')}
        </span>
      </div>
    </>
  );
};

/* ----------------------------------------------------------------- content */

const ContentStage: React.FC<{
  deck: SlideDeck;
  page: ContentPage;
  time: number;
  elapsed: number;
  showCaptions: boolean;
}> = ({ deck, page, time, elapsed, showCaptions }) => {
  const { slide } = page;
  const ink = sectionPrint(page.section.id);
  const geo = pageGeometry(page, browserMeasure);
  const headP = enter(elapsed, 0, 0.26);

  return (
    <>
      {slide.secondaryPhoto ? (
        <>
          <PhotoPlate src={assetUrl(slide.photo.src)} x={0} y={0} width={GRID.plateW} height={468} priority />
          <div style={{ position: 'absolute', left: 0, top: 468, width: GRID.plateW, height: 4, background: PRINT.paper }} />
          <PhotoPlate src={assetUrl(slide.secondaryPhoto.src)} x={0} y={472} width={GRID.plateW} height={468} priority />
        </>
      ) : (
        <PhotoPlate
          src={assetUrl(slide.photo.src)}
          x={0}
          y={0}
          width={GRID.plateW}
          height={940}
          zoom={1 + 0.03 * clamp01(elapsed / Math.max(1, page.end - page.start))}
          priority
        />
      )}
      <Rule x={GRID.plateW} y={0} width={HAIR} color={PRINT.ink} style={{ height: 940 }} />

      <RunningHead
        left="Bad Actors — How Politicians Pretend"
        right={`${deck.episode.politician.toUpperCase()} · ${seasonLabel(deck.episode)}`}
      />

      {/* Section tick + kicker */}
      <div
        style={{
          position: 'absolute',
          left: GRID.colX,
          top: 124,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          opacity: headP,
        }}
      >
        <div style={{ width: 10, height: 10, background: ink.accent }} />
        <Kicker size={16} color={ink.accent} letterSpacing={0.24} weight={700}>
          Section {page.section.number} · {page.section.shortLabel.split(' · ')[0]}
        </Kicker>
      </div>

      <div style={{ position: 'absolute', left: GRID.colX, top: HEAD_TOP }}>
        <Fitted
          text={slide.headline}
          family={TYPE.display}
          weight={900}
          maxWidth={GRID.colW}
          maxLines={2}
          maxSize={page.headlineMax}
          minSize={42}
          lineHeight={0.97}
          letterSpacing={-0.005}
          progress={headP}
        />
      </div>

      {page.showSubheadline && geo.subLines.length > 0 && (
        <div
          style={{
            position: 'absolute',
            left: GRID.colX,
            top: geo.subTop,
            width: GRID.colW - 40,
            opacity: enter(elapsed, 0.08),
            transform: `translateY(${(1 - enter(elapsed, 0.08)) * 8}px)`,
          }}
        >
          <Copy
            text={slide.subheadline}
            size={geo.subSize}
            maxWidth={GRID.colW - 40}
            maxLines={2}
            color={PRINT.muted}
            lineHeight={1.38}
          />
        </div>
      )}

      <Rule
        x={GRID.colX}
        y={geo.ruleY}
        width={Math.round(96 * enter(elapsed, 0.06, 0.4))}
        thickness={4}
        color={ink.accent}
      />

      <SlideBody page={page} geo={geo} elapsed={elapsed} accent={ink.accent} />

      {/* Footer band: plate credit · live caption · folio */}
      <Rule x={0} y={940} width={STAGE.width} color={PRINT.ink} />
      <div style={{ position: 'absolute', left: 40, top: 960, width: 520 }}>
        <Kicker size={12.5} color={ink.accent} letterSpacing={0.16} weight={700}>
          {slide.photo.dateTag}
        </Kicker>
        <div style={{ marginTop: 6 }}>
          <Copy
            text={
              slide.secondaryPhoto
                ? `${slide.photo.caption} / ${slide.secondaryPhoto.caption}`
                : slide.photo.caption
            }
            size={12.5}
            maxWidth={510}
            maxLines={2}
            color={PRINT.muted}
            family={TYPE.mono}
            lineHeight={1.5}
          />
        </div>
      </div>

      {showCaptions ? (
        <Caption page={page} time={time} accent={ink.accent} />
      ) : (
        <div style={{ position: 'absolute', left: GRID.colX, top: 966 }}>
          <Kicker size={13} color={PRINT.muted} letterSpacing={0.18}>
            {page.section.title}
          </Kicker>
        </div>
      )}

      <Folio page={page.folio} total={deck.pages.length} />
    </>
  );
};

/* --------------------------------------------------------------- captions */

const Caption: React.FC<{ page: ContentPage; time: number; accent: string }> = ({ page, time, accent }) => {
  const { slide } = page;
  const { caption } = TEXT_LIMITS;
  const words = slide.narration.split(/\s+/).filter(Boolean);
  const duration = Math.max(0.1, slide.speechEnd - slide.speechStart);
  const rel = clamp01((time - slide.speechStart) / duration);
  const activeIndex = Math.min(words.length - 1, Math.floor(rel * words.length));
  const chunkStart = Math.floor(activeIndex / caption.wordsPerChunk) * caption.wordsPerChunk;
  const visible = words.slice(chunkStart, chunkStart + caption.wordsPerChunk);

  const fade = Math.min(
    clamp01((time - (slide.speechStart - 0.2)) / 0.18),
    clamp01((slide.speechEnd + 0.35 - time) / 0.18),
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: GRID.colX,
        top: 984,
        width: caption.width,
        opacity: fade,
        display: 'flex',
        flexWrap: 'wrap',
        columnGap: 9,
        rowGap: 0,
        alignContent: 'flex-start',
        maxHeight: 80,
        overflow: 'hidden',
      }}
    >
      {visible.map((word, i) => {
        const globalIndex = chunkStart + i;
        const isActive = globalIndex === activeIndex;
        return (
          <span
            key={`${globalIndex}-${word}`}
            style={{
              fontFamily: TYPE.sans,
              fontWeight: isActive ? 800 : 500,
              fontSize: caption.size,
              lineHeight: 1.3,
              color: isActive ? accent : PRINT.inkSoft,
              ...(isActive
                ? {
                    backgroundImage: `linear-gradient(${accent}, ${accent})`,
                    backgroundSize: '100% 2px',
                    backgroundPosition: '0 100%',
                    backgroundRepeat: 'no-repeat',
                  }
                : {}),
              ...CRISP_TEXT,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

/* ------------------------------------------------------------------- bodies */

interface BodyProps {
  page: ContentPage;
  geo: PageGeometry;
  elapsed: number;
  accent: string;
}

const SlideBody: React.FC<BodyProps> = (props) => {
  const { slide } = props.page;
  if (slide.layout === 'buzzword-bars' && slide.buzzwords?.length) return <BarsBody {...props} />;
  if (slide.layout === 'contradictions' && slide.contradictions?.length) return <SplitBody {...props} />;
  if (slide.layout === 'verbatim-quotes' && slide.quotes?.length) return <QuotesBody {...props} />;
  if (slide.layout === 'specificity-meter' && slide.claims?.length) return <SpecificityBody {...props} />;
  if (slide.layout === 'record-scorecard' && slide.scorecard?.length) return <ScorecardBody {...props} />;
  if (slide.layout === 'verdict' && slide.bullets?.length) return <StatementBody {...props} />;
  if (slide.bullets?.length) return props.page.columns === 2 ? <ColumnsBody {...props} /> : <TimelineBody {...props} />;
  return null;
};

const itemEnter = (elapsed: number, index: number) => enter(elapsed, 0.12 + index * 0.075, 0.3);

const TimelineBody: React.FC<BodyProps> = ({ page, geo, elapsed, accent }) => {
  const bullets = page.slide.bullets ?? [];
  const L = TEXT_LIMITS.timeline;
  const rowHeight = geo.bodyHeight / Math.max(bullets.length, 1);
  const copyWidth = GRID.colW - L.tagWidth - L.tagGap;

  return (
    <>
      {bullets.map((bullet, i) => {
        const p = itemEnter(elapsed, i);
        const y = geo.bodyTop + i * rowHeight;
        return (
          <div key={bullet.tag + i}>
            {i > 0 && <Rule x={GRID.colX} y={Math.round(y)} width={GRID.colW} color={PRINT.hair} />}
            <div
              style={{
                position: 'absolute',
                left: GRID.colX,
                top: y + L.rowPadding,
                width: GRID.colW,
                display: 'flex',
                opacity: p,
                transform: `translateX(${(1 - p) * 14}px)`,
              }}
            >
              <div style={{ width: L.tagWidth, paddingRight: L.tagGap, display: 'flex' }}>
                <div style={{ width: 17, paddingTop: 6 }}>
                  <div style={{ width: 6, height: 6, background: accent }} />
                </div>
                <div style={{ width: L.tagWidth - L.tagGap - 17 }}>
                  <Copy
                    text={bullet.tag}
                    size={L.tagSize}
                    maxWidth={L.tagWidth - L.tagGap - 17}
                    maxLines={L.tagLines}
                    color={PRINT.inkSoft}
                    family={TYPE.mono}
                    weight={700}
                    lineHeight={1.45}
                    letterSpacing={1.5}
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
              </div>
              <div style={{ width: copyWidth }}>
                <Fitted
                  text={bullet.title}
                  family={TYPE.sans}
                  weight={800}
                  maxWidth={copyWidth}
                  maxLines={L.titleLines}
                  maxSize={L.titleMax}
                  minSize={18}
                  lineHeight={1.16}
                  color={PRINT.ink}
                />
                <div style={{ marginTop: 7, maxHeight: Math.max(0, rowHeight - 84), overflow: 'hidden' }}>
                  <Copy
                    text={bullet.detail}
                    size={L.detailSize}
                    maxWidth={copyWidth}
                    maxLines={L.detailLines}
                    color={PRINT.muted}
                    lineHeight={1.36}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};

const ColumnsBody: React.FC<BodyProps> = ({ page, geo, elapsed, accent }) => {
  const bullets = page.slide.bullets ?? [];
  const L = TEXT_LIMITS.columns;
  const columns = page.columns;
  const cellWidth = geo.cellWidth;
  const rows = Math.ceil(bullets.length / columns);
  const rowHeight = geo.bodyHeight / Math.max(rows, 1);

  return (
    <>
      {columns > 1 &&
        Array.from({ length: columns - 1 }).map((_, c) => (
          <Rule
            key={`gutter-${c}`}
            x={GRID.colX + cellWidth * (c + 1) + L.gutter * c + L.gutter / 2}
            y={geo.bodyTop}
            width={HAIR}
            color={PRINT.hair}
            style={{ height: geo.bodyHeight }}
          />
        ))}
      {Array.from({ length: Math.max(0, rows - 1) }).map((_, r) => (
        <Rule
          key={`row-rule-${r}`}
          x={GRID.colX}
          y={Math.round(geo.bodyTop + (r + 1) * rowHeight)}
          width={GRID.colW}
          color={PRINT.hair}
        />
      ))}
      {bullets.map((bullet, i) => {
        const column = i % columns;
        const row = Math.floor(i / columns);
        const p = itemEnter(elapsed, i);
        return (
          <div
            key={bullet.tag + i}
            style={{
              position: 'absolute',
              left: GRID.colX + column * (cellWidth + L.gutter),
              top: geo.bodyTop + row * rowHeight + 4,
              width: cellWidth,
              opacity: p,
              transform: `translateY(${(1 - p) * 12}px)`,
            }}
          >
            <Kicker size={13} color={accent} letterSpacing={0.16} weight={700}>
              {bullet.tag}
            </Kicker>
            <div style={{ marginTop: 8 }}>
              <Fitted
                text={bullet.title}
                family={TYPE.sans}
                weight={800}
                maxWidth={cellWidth}
                maxLines={L.titleLines}
                maxSize={L.titleMax}
                minSize={17}
                lineHeight={1.18}
                color={PRINT.ink}
              />
            </div>
            <div style={{ marginTop: 8, maxHeight: Math.max(0, rowHeight - L.headHeight), overflow: 'hidden' }}>
              <Copy
                text={bullet.detail}
                size={L.detailSize}
                maxWidth={cellWidth}
                maxLines={L.detailLines}
                color={PRINT.muted}
                lineHeight={1.36}
              />
            </div>
          </div>
        );
      })}
    </>
  );
};

const SplitBody: React.FC<BodyProps> = ({ page, geo, elapsed, accent }) => {
  const items = page.slide.contradictions ?? [];
  const L = TEXT_LIMITS.split;
  const rowHeight = geo.bodyHeight / Math.max(items.length, 1);
  const halfWidth = (GRID.colW - L.arrowWidth) / 2;

  return (
    <>
      <Rule
        x={GRID.colX + halfWidth + L.arrowWidth / 2}
        y={geo.bodyTop + 8}
        width={HAIR}
        color={PRINT.hairMid}
        style={{ height: geo.bodyHeight - 16 }}
      />
      {items.map((item, i) => {
        const p = itemEnter(elapsed, i);
        const y = geo.bodyTop + i * rowHeight;
        return (
          <div key={item.topic}>
            {i > 0 && <Rule x={GRID.colX} y={Math.round(y)} width={GRID.colW} color={PRINT.hair} />}
            <div
              style={{
                position: 'absolute',
                left: GRID.colX,
                top: y + 16,
                width: GRID.colW,
                opacity: p,
                transform: `translateY(${(1 - p) * 10}px)`,
              }}
            >
              <Kicker size={13} color={accent} letterSpacing={0.18} weight={700}>
                {item.topic}
              </Kicker>
              <div style={{ display: 'flex', marginTop: 10 }}>
                <div style={{ width: halfWidth }}>
                  <div
                    style={{
                      fontFamily: TYPE.mono,
                      fontSize: 11.5,
                      letterSpacing: '0.14em',
                      color: PRINT.muted,
                      textTransform: 'uppercase',
                      marginBottom: 5,
                    }}
                  >
                    {item.earlierDate} · Before
                  </div>
                  <Copy
                    text={item.earlierPosition}
                    size={L.size}
                    maxWidth={halfWidth}
                    maxLines={L.lines}
                    color={PRINT.inkSoft}
                    lineHeight={1.36}
                  />
                </div>
                <div style={{ width: L.arrowWidth, position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: L.arrowWidth / 2 - 12,
                      top: 22,
                      width: 24,
                      textAlign: 'center',
                      background: PRINT.paper,
                      fontFamily: TYPE.mono,
                      fontSize: 18,
                      color: accent,
                    }}
                  >
                    →
                  </div>
                </div>
                <div style={{ width: halfWidth }}>
                  <div
                    style={{
                      fontFamily: TYPE.mono,
                      fontSize: 11.5,
                      letterSpacing: '0.14em',
                      color: accent,
                      textTransform: 'uppercase',
                      marginBottom: 5,
                      fontWeight: 700,
                    }}
                  >
                    {item.laterDate} · After
                  </div>
                  <Copy
                    text={item.laterPosition}
                    size={L.size}
                    maxWidth={halfWidth}
                    maxLines={L.lines}
                    color={PRINT.ink}
                    weight={700}
                    lineHeight={1.36}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};

const BarsBody: React.FC<BodyProps> = ({ page, geo, elapsed, accent }) => {
  const bars = page.slide.buzzwords ?? [];
  const L = TEXT_LIMITS.bars;
  const scaleMax = Math.max(1, ...bars.map((b) => b.perThousandWords)) * 1.12;
  const rowHeight = (geo.bodyHeight - L.headerHeight) / Math.max(bars.length, 1);
  const labelRoom = GRID.colW - L.valueWidth;

  return (
    <>
      <div style={{ position: 'absolute', left: GRID.colX, top: geo.bodyTop, width: GRID.colW }}>
        <Kicker size={12} color={PRINT.muted} letterSpacing={0.18}>
          Mentions per 1,000 words · full corpus
        </Kicker>
      </div>
      {bars.map((bar, i) => {
        const p = itemEnter(elapsed, i);
        const y = geo.bodyTop + L.headerHeight + i * rowHeight;
        return (
          <div
            key={bar.label}
            style={{
              position: 'absolute',
              left: GRID.colX,
              top: y,
              width: GRID.colW,
              opacity: Math.min(1, p * 1.6),
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, width: labelRoom }}>
                <span
                  style={{
                    fontFamily: TYPE.sans,
                    fontSize: L.labelMax,
                    fontWeight: 800,
                    color: PRINT.ink,
                    letterSpacing: '-0.005em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {smartQuotes(bar.label)}
                </span>
                <span
                  style={{
                    fontFamily: TYPE.sans,
                    fontSize: 15,
                    fontWeight: 500,
                    color: PRINT.muted,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: L.noteMaxWidth,
                  }}
                >
                  {smartQuotes(bar.note)}
                </span>
              </div>
              <div
                style={{
                  fontFamily: TYPE.numeral,
                  fontSize: 26,
                  color: accent,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.01em',
                }}
              >
                {(bar.perThousandWords * p).toFixed(1)}
              </div>
            </div>
            <div style={{ position: 'relative', marginTop: 8, height: L.trackHeight, width: GRID.colW }}>
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 7,
                  width: GRID.colW,
                  height: HAIR,
                  background: PRINT.hairMid,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 1,
                  height: 14,
                  width: Math.max(2, (bar.perThousandWords / scaleMax) * GRID.colW * p),
                  background: i === 0 ? accent : PRINT.ink,
                }}
              />
            </div>
          </div>
        );
      })}
    </>
  );
};

const QuotesBody: React.FC<BodyProps> = ({ page, geo, elapsed, accent }) => {
  const quotes = page.slide.quotes ?? [];
  const L = TEXT_LIMITS.quotes;
  const rowHeight = geo.bodyHeight / Math.max(quotes.length, 1);

  return (
    <>
      {quotes.map((quote, i) => {
        const p = itemEnter(elapsed, i * 1.6);
        const y = geo.bodyTop + i * rowHeight;
        const text = smartQuotes(quote.quote);
        const lower = text.toLowerCase();
        const idx = lower.indexOf(quote.highlight.toLowerCase());
        const before = idx >= 0 ? text.slice(0, idx) : text;
        const match = idx >= 0 ? text.slice(idx, idx + quote.highlight.length) : '';
        const after = idx >= 0 ? text.slice(idx + quote.highlight.length) : '';
        const sweep = clamp01((elapsed - (0.5 + i * 1.6)) / 0.6);
        return (
          <div key={quote.context + i}>
            {i > 0 && <Rule x={GRID.colX} y={Math.round(y)} width={GRID.colW} color={PRINT.hair} />}
            <div
              style={{
                position: 'absolute',
                left: GRID.colX,
                top: y + 16,
                width: GRID.colW,
                display: 'flex',
                opacity: p,
                transform: `translateY(${(1 - p) * 10}px)`,
              }}
            >
              <div style={{ width: L.gutterWidth, fontFamily: TYPE.numeral, fontSize: 26, color: PRINT.muted, paddingTop: 2 }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <div style={{ width: GRID.colW - L.gutterWidth }}>
                <Kicker size={12.5} color={accent} letterSpacing={0.18} weight={700}>
                  {quote.context}
                </Kicker>
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: TYPE.serif,
                    fontStyle: 'italic',
                    fontSize: L.size,
                    lineHeight: L.lineHeight,
                    color: PRINT.ink,
                    maxHeight: Math.max(0, rowHeight - L.headHeight),
                    overflow: 'hidden',
                    ...CRISP_TEXT,
                  }}
                >
                  <span>{before}</span>
                  <span
                    style={{
                      backgroundImage: `linear-gradient(${PRINT.yellow}, ${PRINT.yellow})`,
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: `${Math.round(sweep * 100)}% 42%`,
                      backgroundPosition: '0 88%',
                      fontWeight: 700,
                      boxDecorationBreak: 'clone',
                      WebkitBoxDecorationBreak: 'clone',
                    }}
                  >
                    {match}
                  </span>
                  <span>{after}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};

const SpecificityBody: React.FC<BodyProps> = ({ page, geo, elapsed }) => {
  const claims = page.slide.claims ?? [];
  const stats = page.slide.specificityStats;
  const L = TEXT_LIMITS.specificity;
  const rowHeight = (geo.bodyHeight - L.meterHeight) / Math.max(claims.length, 1);
  const meterP = easeOut((elapsed - 0.1) / 0.7);
  const colReality = GRID.colW - L.claimWidth - L.verdictWidth;

  return (
    <>
      {stats && (
        <div style={{ position: 'absolute', left: GRID.colX, top: geo.bodyTop, width: GRID.colW }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontFamily: TYPE.numeral, fontSize: 40, color: PRINT.vermilion, lineHeight: 1 }}>
                {(stats.vaguePercent * meterP).toFixed(1)}%
              </span>
              <Kicker size={12} color={PRINT.muted} letterSpacing={0.16}>
                Sweeping · anecdotal · unquantified
              </Kicker>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <Kicker size={12} color={PRINT.muted} letterSpacing={0.16}>
                Cited statute or figure
              </Kicker>
              <span style={{ fontFamily: TYPE.numeral, fontSize: 40, color: PRINT.cobalt, lineHeight: 1 }}>
                {(stats.specificPercent * meterP).toFixed(1)}%
              </span>
            </div>
          </div>
          <div style={{ marginTop: 10, height: 26, width: GRID.colW, background: PRINT.paperDeep, position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: 26,
                width: `${stats.vaguePercent * meterP}%`,
                background: PRINT.vermilion,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: `${stats.vaguePercent * meterP}%`,
                top: 0,
                height: 26,
                width: `${stats.specificPercent * meterP}%`,
                background: PRINT.cobalt,
              }}
            />
          </div>
        </div>
      )}
      {claims.map((claim, i) => {
        const p = itemEnter(elapsed, 1.1 + i * 0.9);
        const y = geo.bodyTop + L.meterHeight + i * rowHeight;
        const verdictColor = claim.verdict === 'Deferred' ? '#8A5A00' : PRINT.vermilion;
        return (
          <div key={claim.claim}>
            <Rule x={GRID.colX} y={Math.round(y)} width={GRID.colW} color={PRINT.hair} />
            <div
              style={{
                position: 'absolute',
                left: GRID.colX,
                top: y + 14,
                width: GRID.colW,
                display: 'flex',
                alignItems: 'flex-start',
                opacity: p,
                transform: `translateX(${(1 - p) * 10}px)`,
              }}
            >
              <div style={{ width: L.claimWidth, paddingRight: L.gap }}>
                <Fitted
                  text={claim.claim}
                  family={TYPE.sans}
                  weight={800}
                  maxWidth={L.claimWidth - L.gap}
                  maxLines={L.claimLines}
                  maxSize={L.claimMax}
                  minSize={15}
                  lineHeight={1.24}
                  color={PRINT.ink}
                />
              </div>
              <div style={{ width: colReality, paddingRight: L.gap }}>
                <Copy
                  text={claim.reality}
                  size={L.realitySize}
                  maxWidth={colReality - L.gap}
                  maxLines={L.realityLines}
                  color={PRINT.muted}
                  lineHeight={1.34}
                />
              </div>
              <div style={{ width: L.verdictWidth }}>
                <div
                  style={{
                    display: 'inline-block',
                    border: `2px solid ${verdictColor}`,
                    color: verdictColor,
                    fontFamily: TYPE.mono,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    padding: '4px 9px',
                  }}
                >
                  {claim.verdict}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};

const ScorecardBody: React.FC<BodyProps> = ({ page, geo, elapsed, accent }) => {
  const rows = page.slide.scorecard ?? [];
  const L = TEXT_LIMITS.scorecard;
  const rowHeight = geo.bodyHeight / Math.max(rows.length, 1);
  const contrastWidth = GRID.colW - L.metricWidth - L.valueWidth;

  return (
    <>
      {rows.map((row, i) => {
        const p = itemEnter(elapsed, 0.1 + i * 0.1);
        const y = geo.bodyTop + i * rowHeight;
        return (
          <div key={row.metric}>
            <Rule x={GRID.colX} y={Math.round(y)} width={GRID.colW} color={i === 0 ? PRINT.ink : PRINT.hair} />
            <div
              style={{
                position: 'absolute',
                left: GRID.colX,
                top: y + L.rowPadding,
                width: GRID.colW,
                display: 'flex',
                alignItems: 'baseline',
                opacity: p,
                transform: `translateX(${(1 - p) * 12}px)`,
              }}
            >
              <div style={{ width: L.metricWidth, paddingRight: 20 }}>
                <Kicker size={13} color={PRINT.inkSoft} letterSpacing={0.14} weight={700}>
                  {smartQuotes(row.metric)}
                </Kicker>
              </div>
              <div
                style={{
                  width: L.valueWidth,
                  fontFamily: TYPE.display,
                  fontWeight: 900,
                  fontSize: L.valueSize,
                  color: accent,
                  letterSpacing: '-0.01em',
                  fontVariantNumeric: 'tabular-nums',
                  ...CRISP_TEXT,
                }}
              >
                {smartQuotes(row.value)}
              </div>
              <div style={{ width: contrastWidth }}>
                <Copy
                  text={row.rhetoricContrast}
                  size={L.contrastSize}
                  maxWidth={contrastWidth}
                  maxLines={L.contrastLines}
                  color={PRINT.muted}
                  lineHeight={1.36}
                />
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};

const StatementBody: React.FC<BodyProps> = ({ page, geo, elapsed, accent }) => {
  const items = page.slide.bullets ?? [];
  const L = TEXT_LIMITS.statement;
  const rowHeight = geo.bodyHeight / Math.max(items.length, 1);

  return (
    <>
      {items.map((item, i) => {
        const p = itemEnter(elapsed, i);
        const y = geo.bodyTop + i * rowHeight;
        return (
          <div key={item.tag + i}>
            {i > 0 && <Rule x={GRID.colX} y={Math.round(y)} width={GRID.colW} color={PRINT.hair} />}
            <div
              style={{
                position: 'absolute',
                left: GRID.colX,
                top: y + 20,
                width: GRID.colW,
                display: 'flex',
                opacity: p,
                transform: `translateY(${(1 - p) * 12}px)`,
              }}
            >
              <div
                style={{
                  width: L.numberWidth,
                  fontFamily: TYPE.numeral,
                  fontSize: 46,
                  lineHeight: 0.9,
                  color: accent,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              <div style={{ width: GRID.colW - L.numberWidth }}>
                <Fitted
                  text={item.title}
                  family={TYPE.display}
                  weight={900}
                  maxWidth={GRID.colW - L.numberWidth}
                  maxLines={L.titleLines}
                  maxSize={L.titleMax}
                  minSize={22}
                  lineHeight={1.06}
                  color={PRINT.ink}
                />
                <div style={{ marginTop: 10, maxHeight: Math.max(0, rowHeight - 92), overflow: 'hidden' }}>
                  <Copy
                    text={item.detail}
                    size={L.detailSize}
                    maxWidth={GRID.colW - L.numberWidth - 44}
                    maxLines={L.detailLines}
                    color={PRINT.muted}
                    lineHeight={1.4}
                  />
                </div>
                <div style={{ marginTop: 10 }}>
                  <Kicker size={11.5} color={PRINT.muted} letterSpacing={0.16}>
                    {item.tag}
                  </Kicker>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};

/* --------------------------------------------------------- page utilities */

export const pageLabel = (page: DeckPage): string => {
  if (page.kind === 'cover') return 'Title';
  if (page.kind === 'bumper') return page.section.title;
  return page.slide.headline;
};

export const pageSection = (page: DeckPage) => page.section.title;
export const pageSlideOf = (page: DeckPage): BadActorsSlide | null =>
  page.kind === 'content' ? page.slide : null;
export const pageAccent = (page: DeckPage): string => sectionPrint(page.section.id).accent;
