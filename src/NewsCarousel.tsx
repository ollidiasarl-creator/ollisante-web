import { useEffect, useRef, useState } from 'react';
import { News } from './api';
import { flag } from './format';

const COLORS = ['#176b50', '#b85c38', '#0f2a47'];
const colorOf = (n: News) => COLORS[([...n.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0) >>> 0) % COLORS.length];

/**
 * Actualités en cartes illustrées qui défilent seules (toutes les 5 secondes), comme les rubriques « à la une » des
 * grands sites de santé : photo (ou visuel aux couleurs Ollisanté avec le drapeau), titre sur un voile, « Lire ».
 * Pause au survol ou au toucher ; flèches et points pour naviguer.
 */
export function NewsCarousel({ items, meta, onOpen }: { items: News[]; meta: (n: News) => string; onOpen: (n: News) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const paused = useRef(false);

  const go = (i: number) => {
    const el = track.current;
    const card = el?.children.item(i) as HTMLElement | null;
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: 'smooth' });
  };
  useEffect(() => {
    if (items.length < 2) return;
    const timer = setInterval(() => {
      if (paused.current || document.hidden) return;
      setIndex((i) => {
        const next = (i + 1) % items.length;
        go(next);
        return next;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [items]);
  // Position réelle après un glissement manuel.
  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const w = (el.children.item(0) as HTMLElement | null)?.offsetWidth ?? 1;
    setIndex(Math.round(el.scrollLeft / (w + 16)));
  };

  return (
    <div className="news-carousel" onMouseEnter={() => (paused.current = true)} onMouseLeave={() => (paused.current = false)}
      onTouchStart={() => (paused.current = true)} onTouchEnd={() => setTimeout(() => (paused.current = false), 6000)}>
      <div className="news-track" ref={track} onScroll={onScroll}>
        {items.map((n) => (
          <button key={n.id} type="button" className="news-slide" onClick={() => onOpen(n)}
            style={n.imageUrl ? { backgroundImage: `url(${n.imageUrl})` } : { backgroundColor: colorOf(n) }}>
            {n.imageUrl ? null : <span className="news-flag" aria-hidden="true">{n.countryCode ? flag(n.countryCode) : '🌍'}</span>}
            <span className="news-veil">
              <span className="news-slide-meta">{meta(n)}</span>
              <span className="news-slide-title">{n.title}</span>
              <span className="news-read">Lire →</span>
            </span>
          </button>
        ))}
      </div>
      {items.length > 1 ? (
        <div className="news-nav">
          <button type="button" aria-label="Actualité précédente" onClick={() => { const i = (index - 1 + items.length) % items.length; setIndex(i); go(i); }}>‹</button>
          <span className="news-dots" aria-hidden="true">
            {items.map((n, i) => <span key={n.id} className={i === index ? 'on' : undefined} />)}
          </span>
          <button type="button" aria-label="Actualité suivante" onClick={() => { const i = (index + 1) % items.length; setIndex(i); go(i); }}>›</button>
        </div>
      ) : null}
    </div>
  );
}
