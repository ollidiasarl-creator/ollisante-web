import { News } from './api';
import { flag } from './format';

const COLORS = ['#176b50', '#b85c38', '#0f2a47'];
const colorOf = (n: News) => COLORS[([...n.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0) >>> 0) % COLORS.length];
const excerpt = (s: string | null) => (s ?? '').replace(/\s+/g, ' ').trim();

/**
 * Actualités au format des grands sites de santé (Qare, Doctolib) : une grille de cartes, chacune avec son image
 * (ou un visuel aux couleurs Ollisanté et le drapeau), l'étiquette du pays, la date, le titre et un court extrait.
 */
export function NewsGrid({ items, place, date, onOpen }: {
  items: News[]; place: (n: News) => string; date: (n: News) => string; onOpen: (n: News) => void;
}) {
  return (
    <div className="news-grid">
      {items.map((n) => (
        <button key={n.id} type="button" className="news-item" onClick={() => onOpen(n)}>
          <span className="news-pic" style={n.imageUrl ? { backgroundImage: `url(${n.imageUrl})` } : { backgroundColor: colorOf(n) }}>
            {n.imageUrl ? null : <span className="news-pic-flag" aria-hidden="true">{n.countryCode ? flag(n.countryCode) : '🌍'}</span>}
          </span>
          <span className="news-body-text">
            <span className="news-tags"><span className="news-tag">{place(n)}</span><span className="news-date">{date(n)}</span></span>
            <strong className="news-item-title">{n.title}</strong>
            {n.body ? <span className="news-excerpt">{excerpt(n.body)}</span> : null}
          </span>
        </button>
      ))}
    </div>
  );
}
