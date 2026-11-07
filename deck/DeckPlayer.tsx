import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BAD_ACTORS_EP01_JD_VANCE } from '../src/data/badActorsJDVance';
import { compileDeck, formatTimecode, pageAt, pageIndexAt } from '../src/slides/deck';
import { DeckStage, pageLabel } from '../src/slides/DeckStage';
import { assetUrl } from '../src/slides/fonts';

const MIN_SCALE = 0.1;

/**
 * Presentation player.
 *
 * The deck is authored at a fixed 1920×1080 and scaled to the viewport exactly
 * like a projector would, so nothing reflows and no type is re-fitted. Chrome
 * is limited to a typographic rule, a slide counter and a progress rail; it
 * fades out while the deck is running.
 */
export const DeckPlayer: React.FC = () => {
  const deck = useMemo(() => compileDeck(BAD_ACTORS_EP01_JD_VANCE), []);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [muted, setMuted] = useState(false);
  const [scale, setScale] = useState(1);
  const [idle, setIdle] = useState(false);

  const areaRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeRef = useRef(0);
  const playingRef = useRef(false);
  const lastTsRef = useRef<number | null>(null);
  const lastPaintRef = useRef(0);
  const idleTimer = useRef<number | null>(null);

  const page = pageAt(deck, time);
  const pageIndex = pageIndexAt(deck, time);
  const elapsedInPage = time - page.start;

  /* ------------------------------------------------------------- projection */

  useEffect(() => {
    const fit = () => {
      const area = areaRef.current;
      if (!area) return;
      const { width, height } = area.getBoundingClientRect();
      const next = Math.max(
        MIN_SCALE,
        Math.min((width - 32) / 1920, (height - 16) / 1080),
      );
      setScale(next);
    };
    fit();
    window.addEventListener('resize', fit);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    if (observer && areaRef.current) observer.observe(areaRef.current);
    return () => {
      window.removeEventListener('resize', fit);
      observer?.disconnect();
    };
  }, []);

  /* ------------------------------------------------------------------ clock */

  useEffect(() => {
    let raf = 0;
    const loop = (ts: number) => {
      raf = window.requestAnimationFrame(loop);
      if (!playingRef.current) {
        lastTsRef.current = ts;
        return;
      }
      const audio = audioRef.current;
      let next = timeRef.current;
      if (audio && !audio.paused && audio.readyState >= 2) {
        next = audio.currentTime;
      } else {
        const previous = lastTsRef.current ?? ts;
        next = timeRef.current + (ts - previous) / 1000;
      }
      lastTsRef.current = ts;

      if (next >= deck.duration) {
        next = deck.duration;
        playingRef.current = false;
        setPlaying(false);
      }
      timeRef.current = next;
      // Repaint at a steady 30fps — the deck itself is authored at 30fps.
      if (next - lastPaintRef.current >= 1 / 30 || next === deck.duration) {
        lastPaintRef.current = next;
        setTime(next);
      }
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [deck.duration]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = muted;
  }, [muted]);

  /* ------------------------------------------------------------------ audio */

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      if (Math.abs(audio.currentTime - timeRef.current) > 0.25) {
        try {
          audio.currentTime = timeRef.current;
        } catch {
          /* seeking before metadata is ready — the loop will catch up */
        }
      }
      void audio.play().catch(() => {
        /* Autoplay blocked: the wall clock keeps the deck moving. */
      });
    } else {
      audio.pause();
    }
  }, [playing]);

  /* ---------------------------------------------------------------- command */

  const seek = (seconds: number) => {
    const clamped = Math.max(0, Math.min(deck.duration, seconds));
    timeRef.current = clamped;
    lastPaintRef.current = clamped;
    setTime(clamped);
    const audio = audioRef.current;
    if (audio) {
      try {
        audio.currentTime = clamped;
      } catch {
        /* ignore */
      }
    }
  };

  const togglePlay = () => setPlaying((p) => !p);

  const goToPage = (index: number) => {
    const target = deck.pages[Math.max(0, Math.min(deck.pages.length - 1, index))];
    if (target) seek(target.start + 0.001);
  };

  const nextPage = () => goToPage(pageIndex + 1);
  const previousPage = () => {
    // Slideshow convention: rewind inside the current slide first.
    if (elapsedInPage > 1.5) seek(page.start + 0.001);
    else goToPage(pageIndex - 1);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    } else {
      void document.exitFullscreen?.().catch(() => undefined);
    }
  };

  /* -------------------------------------------------------------- shortcuts */

  // Registered once; handlers read through a ref so the listener never
  // churns at 30fps.
  const commandRef = useRef<(key: string, event: KeyboardEvent) => void>(() => undefined);
  commandRef.current = (key, event) => {
    if (key === ' ' || key === 'k') {
      event.preventDefault();
      togglePlay();
    } else if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'PageDown') {
      event.preventDefault();
      nextPage();
    } else if (key === 'ArrowLeft' || key === 'ArrowUp' || key === 'PageUp') {
      event.preventDefault();
      previousPage();
    } else if (key === 'Home') {
      seek(0);
    } else if (key === 'End') {
      seek(deck.duration - 0.1);
    } else if (key === 'c') {
      setCaptions((c) => !c);
    } else if (key === 'm') {
      setMuted((m) => !m);
    } else if (key === 'f') {
      toggleFullscreen();
    } else if (key === 'r') {
      seek(0);
      setPlaying(true);
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => commandRef.current(event.key, event);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ------------------------------------------------------------- auto-hide */

  useEffect(() => {
    const wake = () => {
      setIdle(false);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
      idleTimer.current = window.setTimeout(() => {
        if (playingRef.current) setIdle(true);
      }, 2600);
    };
    window.addEventListener('mousemove', wake);
    window.addEventListener('pointerdown', wake);
    wake();
    return () => {
      window.removeEventListener('mousemove', wake);
      window.removeEventListener('pointerdown', wake);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!playing) {
      setIdle(false);
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    }
  }, [playing]);

  /* ------------------------------------------------------------------ paint */

  const progress = Math.max(0, Math.min(1, time / deck.duration));
  const showHint = !playing && time < 0.4;
  const nowLabel = `${page.section.number} · ${page.section.shortLabel.split(' · ')[0]} — ${pageLabel(page)}`;

  return (
    <div className={`player${idle ? ' is-idle' : ''}`}>
      <div className="player__stage-area" ref={areaRef}>
        <div className="player__stage" style={{ transform: `scale(${scale})` }}>
          <DeckStage deck={deck} time={time} showCaptions={captions} />
          <div className="player__hit" onClick={togglePlay} title="Play / pause" />
          <div className={`player__hint${showHint ? ' is-visible' : ''}`}>
            Space or click to begin
          </div>
        </div>
      </div>

      <div className="player__chrome">
        <div className="player__brand">
          <strong>Bad Actors</strong>{' '}
          <span>· Episode {String(deck.episode.episodeNumber).padStart(2, '0')}</span>
        </div>
        <div className="player__now">{nowLabel}</div>
        <div className="player__controls">
          <button
            className="player__control"
            onClick={(event) => {
              event.currentTarget.blur();
              previousPage();
            }}
            aria-label="Previous slide"
          >
            ← Prev
          </button>
          <button
            className="player__control"
            onClick={(event) => {
              event.currentTarget.blur();
              togglePlay();
            }}
            aria-label="Play or pause"
          >
            {playing ? '❚❚ Pause' : '▶ Play'}
          </button>
          <button
            className="player__control"
            onClick={(event) => {
              event.currentTarget.blur();
              nextPage();
            }}
            aria-label="Next slide"
          >
            Next →
          </button>
          <button
            className="player__control"
            onClick={() => setCaptions((c) => !c)}
            aria-pressed={captions}
          >
            {captions ? 'Captions on' : 'Captions off'}
          </button>
          <button className="player__control" onClick={() => setMuted((m) => !m)} aria-pressed={!muted}>
            {muted ? 'Muted' : 'Sound'}
          </button>
          <button className="player__control" onClick={toggleFullscreen} aria-label="Fullscreen">
            Fullscreen
          </button>
        </div>
        <div className="player__counter">
          <b>
            {String(page.folio).padStart(2, '0')} / {String(deck.pages.length).padStart(2, '0')}
          </b>
          <span>
            {'  '}
            {formatTimecode(time)} / {formatTimecode(deck.duration)}
          </span>
        </div>
      </div>

      <div className="player__rail">
        <div className="player__rail-fill" style={{ width: `${progress * 100}%` }} />
        {deck.pages.map((p) => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${(p.start / deck.duration) * 100}%`,
              width: 1,
              background: 'rgba(246,244,238,0.28)',
            }}
          />
        ))}
      </div>

      <audio ref={audioRef} src={assetUrl(deck.episode.audioSrc)} preload="auto" />
    </div>
  );
};
