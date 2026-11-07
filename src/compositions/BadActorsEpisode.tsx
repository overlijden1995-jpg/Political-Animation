import * as React from 'react';
import {
  Audio,
  Composition,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {
  BAD_ACTORS_EP01_JD_VANCE,
} from '../data/badActorsJDVance';
import type {
  BadActorsEpisode as BadActorsEpisodeData,
  BadActorsSlide,
} from '../agents/badActorsAgent';

const FPS = 30;
const W = 1920;
const H = 1080;

export interface BadActorsEpisodeProps {
  episode?: BadActorsEpisodeData;
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3);

const formatTimecode = (sec: number): string => {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
};

const renderHighlightedQuote = (quote: string, highlight: string, accent: string, progress: number) => {
  const idx = quote.toLowerCase().indexOf(highlight.toLowerCase());
  if (idx === -1) return <span>{quote}</span>;
  const before = quote.slice(0, idx);
  const match = quote.slice(idx, idx + highlight.length);
  const after = quote.slice(idx + highlight.length);
  const bgAlpha = 0.32 * clamp01(progress);
  return (
    <>
      <span>{before}</span>
      <span
        style={{
          background: `linear-gradient(90deg, ${accent}${Math.round(bgAlpha * 255)
            .toString(16)
            .padStart(2, '0')} 0%, ${accent}55 100%)`,
          color: '#FFFFFF',
          fontWeight: 800,
          padding: '2px 8px',
          borderRadius: 6,
          borderBottom: `3px solid ${accent}`,
        }}
      >
        {match}
      </span>
      <span>{after}</span>
    </>
  );
};

const PoliticianPhotoPanel: React.FC<{
  slide: BadActorsSlide;
  slideElapsed: number;
  slideDuration: number;
}> = ({ slide, slideElapsed, slideDuration }) => {
  const zoom = interpolate(slideElapsed, [0, slideDuration], [1.0, 1.075], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const enter = easeOutCubic(slideElapsed / 0.55);

  if (slide.secondaryPhoto) {
    // Dual split portrait (THEN vs NOW)
    return (
      <div
        style={{
          position: 'absolute',
          left: 64,
          top: 158,
          width: 560,
          height: 756,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          opacity: enter,
          transform: `translateY(${(1 - enter) * 24}px)`,
        }}
      >
        {[slide.photo, slide.secondaryPhoto].map((ph, idx) => (
          <div
            key={ph.src}
            style={{
              position: 'relative',
              flex: 1,
              borderRadius: 16,
              overflow: 'hidden',
              border: `2px solid ${idx === 0 ? '#64748B' : slide.accentColor}`,
              background: '#0F172A',
              boxShadow: '0 18px 40px rgba(0,0,0,0.45)',
            }}
          >
            <Img
              src={staticFile(ph.src)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center 20%',
                transform: `scale(${zoom})`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 14,
                left: 14,
                padding: '6px 12px',
                borderRadius: 6,
                background: idx === 0 ? 'rgba(15,23,42,0.88)' : slide.accentColor,
                color: idx === 0 ? '#E2E8F0' : '#0B1120',
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: '0.08em',
              }}
            >
              {ph.dateTag}
            </div>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                padding: '22px 16px 12px',
                background: 'linear-gradient(180deg, rgba(11,17,32,0) 0%, rgba(11,17,32,0.92) 70%)',
                color: '#F1F5F9',
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {ph.caption}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: 64,
        top: 158,
        width: 560,
        height: 756,
        borderRadius: 18,
        overflow: 'hidden',
        border: `2px solid ${slide.accentColor}88`,
        background: '#0F172A',
        boxShadow: '0 22px 50px rgba(0,0,0,0.5)',
        opacity: enter,
        transform: `translateY(${(1 - enter) * 24}px)`,
      }}
    >
      <Img
        src={staticFile(slide.photo.src)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: slide.photo.src.includes('08-munich') ? '78% 18%' : 'center 18%',
          transform: `scale(${zoom})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 18,
          left: 18,
          padding: '7px 14px',
          borderRadius: 6,
          background: slide.accentColor,
          color: '#0B1120',
          fontSize: 15,
          fontWeight: 900,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {slide.photo.dateTag}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '44px 22px 18px',
          background: 'linear-gradient(180deg, rgba(11,17,32,0) 0%, rgba(11,17,32,0.94) 68%)',
        }}
      >
        <div
          style={{
            color: '#F8FAFC',
            fontSize: 19,
            fontWeight: 700,
            lineHeight: 1.3,
          }}
        >
          {slide.photo.caption}
        </div>
      </div>
    </div>
  );
};

const SlideContentArea: React.FC<{
  slide: BadActorsSlide;
  slideElapsed: number;
  slideDuration: number;
}> = ({ slide, slideElapsed, slideDuration }) => {
  const headEnter = easeOutCubic(slideElapsed / 0.45);

  return (
    <div
      style={{
        position: 'absolute',
        left: 668,
        top: 158,
        width: 1188,
        height: 756,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Slide Headline + Animated Accent Rule */}
      <div
        style={{
          opacity: headEnter,
          transform: `translateY(${(1 - headEnter) * 18}px)`,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontSize: 42,
            fontWeight: 900,
            color: '#F8FAFC',
            letterSpacing: '-0.015em',
            lineHeight: 1.12,
          }}
        >
          {slide.headline}
        </div>
        <div
          style={{
            fontSize: 21,
            fontWeight: 500,
            color: '#94A3B8',
            marginTop: 8,
          }}
        >
          {slide.subheadline}
        </div>
        <div
          style={{
            marginTop: 14,
            height: 4,
            width: `${Math.round(headEnter * 240)}px`,
            background: slide.accentColor,
            borderRadius: 2,
          }}
        />
      </div>

      {/* Layout-specific animated body */}
      {slide.bullets && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
          {slide.bullets.map((b, i) => {
            const delay = 0.35 + i * (Math.min(slideDuration * 0.48, 12) / Math.max(slide.bullets!.length, 1));
            const p = easeOutCubic((slideElapsed - delay) / 0.55);
            return (
              <div
                key={b.tag}
                style={{
                  padding: '18px 22px',
                  borderRadius: 14,
                  background: 'rgba(30, 41, 59, 0.78)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderLeft: `5px solid ${slide.accentColor}`,
                  opacity: p,
                  transform: `translateX(${(1 - p) * 32}px)`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: 5,
                      background: `${slide.accentColor}26`,
                      color: slide.accentColor,
                      fontSize: 14,
                      fontWeight: 800,
                      letterSpacing: '0.07em',
                    }}
                  >
                    {b.tag}
                  </span>
                  <span style={{ fontSize: 24, fontWeight: 800, color: '#F8FAFC' }}>{b.title}</span>
                </div>
                <div style={{ fontSize: 19, color: '#CBD5E1', lineHeight: 1.4 }}>{b.detail}</div>
              </div>
            );
          })}
        </div>
      )}

      {slide.layout === 'contradictions' && slide.contradictions && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
          {slide.contradictions.map((c, i) => {
            const delay = 0.4 + i * 3.8;
            const p = easeOutCubic((slideElapsed - delay) / 0.6);
            return (
              <div
                key={c.topic}
                style={{
                  padding: '18px 22px',
                  borderRadius: 14,
                  background: 'rgba(30, 41, 59, 0.82)',
                  border: '1px solid rgba(148, 163, 184, 0.22)',
                  opacity: p,
                  transform: `translateY(${(1 - p) * 24}px)`,
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 900,
                    color: slide.accentColor,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginBottom: 10,
                  }}
                >
                  {c.topic}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 1fr', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: 'rgba(15, 23, 42, 0.78)',
                      borderLeft: '4px solid #64748B',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#94A3B8', marginBottom: 4 }}>
                      {c.earlierDate} · BEFORE
                    </div>
                    <div style={{ fontSize: 18, color: '#E2E8F0', lineHeight: 1.35 }}>{c.earlierPosition}</div>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 26, fontWeight: 900, color: slide.accentColor }}>→</div>
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: 'rgba(245, 158, 11, 0.11)',
                      borderLeft: `4px solid ${slide.accentColor}`,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 800, color: slide.accentColor, marginBottom: 4 }}>
                      {c.laterDate} · AFTER
                    </div>
                    <div style={{ fontSize: 18, color: '#FFFFFF', fontWeight: 600, lineHeight: 1.35 }}>
                      {c.laterPosition}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {slide.layout === 'buzzword-bars' && slide.buzzwords && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15, flex: 1 }}>
          {slide.buzzwords.map((bw, i) => {
            const delay = 0.35 + i * 1.6;
            const p = easeOutCubic((slideElapsed - delay) / 0.85);
            const widthPct = (bw.perThousandWords / 8.5) * 100 * p;
            return (
              <div
                key={bw.label}
                style={{
                  padding: '13px 20px',
                  borderRadius: 12,
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(148, 163, 184, 0.18)',
                  opacity: clamp01(p * 1.5),
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                  <div>
                    <span style={{ fontSize: 21, fontWeight: 800, color: '#F8FAFC' }}>{bw.label}</span>
                    <span style={{ fontSize: 16, color: '#94A3B8', marginLeft: 14 }}>— {bw.note}</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: slide.accentColor, fontVariantNumeric: 'tabular-nums' }}>
                    {(bw.perThousandWords * p).toFixed(1)} / 1k
                  </div>
                </div>
                <div style={{ height: 12, borderRadius: 6, background: '#0F172A', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${widthPct}%`,
                      borderRadius: 6,
                      background: `linear-gradient(90deg, ${slide.accentColor} 0%, #38BDF8 100%)`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {slide.layout === 'specificity-meter' && slide.specificityStats && slide.claims && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
          {/* Big Split Meter */}
          {(() => {
            const mp = easeOutCubic((slideElapsed - 0.3) / 1.0);
            return (
              <div
                style={{
                  padding: '16px 22px',
                  borderRadius: 14,
                  background: 'rgba(30, 41, 59, 0.88)',
                  border: '1px solid rgba(244, 63, 94, 0.35)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 20, fontWeight: 900, color: '#F43F5E' }}>
                    {(slide.specificityStats.vaguePercent * mp).toFixed(1)}% SWEEPING / ANECDOTAL / UNQUANTIFIED
                  </span>
                  <span style={{ fontSize: 20, fontWeight: 900, color: '#38BDF8' }}>
                    {(slide.specificityStats.specificPercent * mp).toFixed(1)}% CITED NUMBERS OR STATUTES
                  </span>
                </div>
                <div style={{ display: 'flex', height: 22, borderRadius: 8, overflow: 'hidden', background: '#0F172A' }}>
                  <div style={{ width: `${slide.specificityStats.vaguePercent * mp}%`, background: '#F43F5E' }} />
                  <div style={{ width: `${slide.specificityStats.specificPercent * mp}%`, background: '#38BDF8' }} />
                </div>
              </div>
            );
          })()}

          {/* Audit of the 7.4% concrete claims */}
          {slide.claims.map((c, i) => {
            const delay = 2.2 + i * 3.8;
            const p = easeOutCubic((slideElapsed - delay) / 0.55);
            return (
              <div
                key={c.claim}
                style={{
                  padding: '13px 20px',
                  borderRadius: 12,
                  background: 'rgba(30, 41, 59, 0.78)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 18,
                  opacity: p,
                  transform: `translateX(${(1 - p) * 28}px)`,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#F8FAFC', marginBottom: 4 }}>{c.claim}</div>
                  <div style={{ fontSize: 17, color: '#CBD5E1' }}>{c.reality}</div>
                </div>
                <div
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: `2px solid ${c.verdict === 'Deferred' ? '#F59E0B' : '#F43F5E'}`,
                    color: c.verdict === 'Deferred' ? '#F59E0B' : '#F43F5E',
                    fontSize: 15,
                    fontWeight: 900,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c.verdict}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {slide.layout === 'verbatim-quotes' && slide.quotes && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
          {slide.quotes.map((q, i) => {
            const delay = 0.5 + i * 7.5;
            const p = easeOutCubic((slideElapsed - delay) / 0.65);
            const hl = easeOutCubic((slideElapsed - (delay + 0.8)) / 0.8);
            return (
              <div
                key={q.context}
                style={{
                  padding: '20px 24px',
                  borderRadius: 14,
                  background: 'rgba(30, 41, 59, 0.84)',
                  borderLeft: `5px solid ${slide.accentColor}`,
                  border: '1px solid rgba(148, 163, 184, 0.22)',
                  opacity: p,
                  transform: `translateY(${(1 - p) * 22}px)`,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: slide.accentColor,
                    letterSpacing: '0.08em',
                    marginBottom: 8,
                  }}
                >
                  {q.context}
                </div>
                <div style={{ fontSize: 22, color: '#F8FAFC', lineHeight: 1.42, fontStyle: 'italic' }}>
                  {renderHighlightedQuote(q.quote, q.highlight, slide.accentColor, hl)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {slide.layout === 'record-scorecard' && slide.scorecard && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
          {slide.scorecard.map((row, i) => {
            const delay = 0.4 + i * 3.5;
            const p = easeOutCubic((slideElapsed - delay) / 0.55);
            return (
              <div
                key={row.metric}
                style={{
                  padding: '15px 22px',
                  borderRadius: 12,
                  background: 'rgba(30, 41, 59, 0.82)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  display: 'grid',
                  gridTemplateColumns: '255px 295px 1fr',
                  alignItems: 'center',
                  gap: 18,
                  opacity: p,
                  transform: `translateX(${(1 - p) * 26}px)`,
                }}
              >
                <div style={{ fontSize: 17, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase' }}>
                  {row.metric}
                </div>
                <div
                  style={{
                    fontSize: 23,
                    fontWeight: 900,
                    color: slide.accentColor,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {row.value}
                </div>
                <div style={{ fontSize: 18, color: '#E2E8F0', lineHeight: 1.35 }}>{row.rhetoricContrast}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const SubtitleStrip: React.FC<{ slide: BadActorsSlide; time: number }> = ({ slide, time }) => {
  const words = slide.narration.split(/\s+/).filter(Boolean);
  const dur = Math.max(0.1, slide.speechEnd - slide.speechStart);
  const rel = clamp01((time - slide.speechStart) / dur);
  const activeIdx = Math.min(words.length - 1, Math.floor(rel * words.length));
  const chunkSize = 11;
  const chunkStart = Math.floor(activeIdx / chunkSize) * chunkSize;
  const visible = words.slice(chunkStart, chunkStart + chunkSize);

  const inSpeech = time >= slide.speechStart - 0.15 && time <= slide.speechEnd + 0.4;
  if (!inSpeech) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: 64,
        right: 64,
        bottom: 28,
        height: 68,
        borderRadius: 12,
        background: 'rgba(11, 17, 32, 0.88)',
        border: '1px solid rgba(148, 163, 184, 0.22)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 28px',
        gap: 10,
      }}
    >
      {visible.map((w, idx) => {
        const globalIdx = chunkStart + idx;
        const isCurrent = globalIdx === activeIdx;
        return (
          <span
            key={`${globalIdx}-${w}`}
            style={{
              fontSize: 25,
              fontWeight: isCurrent ? 900 : 600,
              color: isCurrent ? slide.accentColor : '#F1F5F9',
              transform: isCurrent ? 'scale(1.06)' : 'scale(1)',
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const BadActorsScene: React.FC<BadActorsEpisodeProps> = ({
  episode = BAD_ACTORS_EP01_JD_VANCE,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  const activeSection =
    episode.sections.find((s) => time >= s.start && time < s.end) ??
    episode.sections[episode.sections.length - 1];

  const activeSlide =
    episode.slides.find((s) => time >= s.start && time < s.end) ??
    episode.slides[episode.slides.length - 1];

  const slideElapsed = Math.max(0, time - activeSlide.start);
  const slideDuration = Math.max(0.1, activeSlide.end - activeSlide.start);
  const sectionElapsed = Math.max(0, time - activeSection.start);

  // Brief kinetic chapter card at the start of each of the 5 sections (first 1.25s)
  const bumperAlpha =
    sectionElapsed < 1.25
      ? sectionElapsed < 0.9
        ? 1
        : 1 - (sectionElapsed - 0.9) / 0.35
      : 0;

  return (
    <div
      style={{
        position: 'relative',
        width: W,
        height: H,
        overflow: 'hidden',
        background: 'radial-gradient(circle at 20% 15%, #172554 0%, #0B1120 58%, #070B14 100%)',
        fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Master AI Voiceover + Documentary Underscore */}
      <Audio src={staticFile(episode.audioSrc)} />

      {/* Subtle architectural grid overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          pointerEvents: 'none',
        }}
      />

      {/* Top Broadcast Header + 5-Section Timeline Bar */}
      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          top: 26,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                background: '#EF4444',
                color: '#FFFFFF',
                fontSize: 15,
                fontWeight: 900,
                letterSpacing: '0.1em',
              }}
            >
              BAD ACTORS
            </span>
            <span style={{ fontSize: 19, fontWeight: 700, color: '#E2E8F0', letterSpacing: '0.03em' }}>
              HOW POLITICIANS PRETEND · EPISODE 0{episode.episodeNumber}: VICE PRESIDENT {episode.politician.toUpperCase()}
            </span>
          </div>
          <div
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 19,
              fontWeight: 700,
              color: '#94A3B8',
            }}
          >
            {formatTimecode(time)} / {formatTimecode(episode.durationSeconds)}
          </div>
        </div>

        {/* 5-Chapter Segmented Progress Bar */}
        <div style={{ display: 'flex', gap: 10 }}>
          {episode.sections.map((sec) => {
            const fill = clamp01((time - sec.start) / sec.durationSeconds);
            const isCurrent = sec.id === activeSection.id;
            return (
              <div
                key={sec.id}
                style={{
                  flex: sec.durationSeconds,
                  background: 'rgba(30, 41, 59, 0.85)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  border: `1px solid ${isCurrent ? sec.accentColor : 'rgba(148,163,184,0.18)'}`,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: isCurrent ? sec.accentColor : '#94A3B8',
                    letterSpacing: '0.06em',
                    marginBottom: 5,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {sec.number} · {sec.shortLabel}
                </div>
                <div style={{ height: 5, borderRadius: 3, background: '#0F172A', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${fill * 100}%`,
                      height: '100%',
                      background: sec.accentColor,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Slide: Left Politician Photo + Right Kinetic Slide */}
      <PoliticianPhotoPanel
        slide={activeSlide}
        slideElapsed={slideElapsed}
        slideDuration={slideDuration}
      />
      <SlideContentArea
        slide={activeSlide}
        slideElapsed={slideElapsed}
        slideDuration={slideDuration}
      />

      {/* Synced AI Voiceover Subtitles */}
      <SubtitleStrip slide={activeSlide} time={time} />

      {/* Chapter Transition Bumper Overlay */}
      {bumperAlpha > 0.01 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(7, 11, 20, 0.92)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: bumperAlpha,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: activeSection.accentColor,
              letterSpacing: '0.22em',
              marginBottom: 14,
            }}
          >
            SECTION {activeSection.number} · {activeSection.durationSeconds} SECONDS
          </div>
          <div
            style={{
              fontSize: 68,
              fontWeight: 900,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              textAlign: 'center',
            }}
          >
            {activeSection.title}
          </div>
          <div
            style={{
              marginTop: 20,
              width: 180,
              height: 5,
              borderRadius: 3,
              background: activeSection.accentColor,
            }}
          />
        </div>
      )}
    </div>
  );
};

export const BadActorsJDVance: React.FC = () => (
  <Composition
    id="BadActorsJDVance"
    component={BadActorsScene}
    durationInFrames={BAD_ACTORS_EP01_JD_VANCE.durationSeconds * FPS}
    fps={FPS}
    width={W}
    height={H}
    defaultProps={{ episode: BAD_ACTORS_EP01_JD_VANCE }}
  />
);
