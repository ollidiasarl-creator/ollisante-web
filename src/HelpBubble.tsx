import { useEffect, useRef, useState } from 'react';
import { useCountry, useLockedCountry } from './brand';
import { useCountries } from './components';
import { href } from './router';

/**
 * Bulle d'aide en bas de l'écran (remplace « Urgence » dans l'en-tête) : d'abord le numéro des secours du pays,
 * car WhatsApp n'est pas un service d'urgence, puis la conversation WhatsApp avec l'équipe.
 */
export function HelpBubble({ whatsapp, hours }: { whatsapp: string | null; hours: string | null }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const [chosen] = useCountry();
  const locked = useLockedCountry();
  const country = useCountries().find((c) => c.code === (locked ?? chosen));
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  const number = country?.emergencyNumber ?? null;

  return (
    <div className="help-bubble" ref={box}>
      {open ? (
        <div className="help-panel" role="dialog" aria-label="Aide Ollisanté">
          <strong className="help-title">Bonjour, comment pouvons-nous vous aider ?</strong>
          <div className="help-urgent">
            <strong>Urgence médicale ?</strong>
            <span>Appelez tout de suite les secours, n’attendez pas de réponse écrite.</span>
            {number ? (
              <a className="btn danger block" href={`tel:${number.replace(/\s/g, '')}`}>Appeler le {number} ({country?.nameFr})</a>
            ) : (
              <a className="btn danger block" href={href('urgence')} onClick={() => setOpen(false)}>Numéros d’urgence par pays</a>
            )}
          </div>
          {whatsapp ? (
            <>
              <a className="btn wa block" target="_blank" rel="noreferrer"
                href={`https://wa.me/${whatsapp}?text=${encodeURIComponent('Bonjour, j’ai une question sur Ollisanté :')}`}>
                Écrire à l’équipe sur WhatsApp
              </a>
              {hours ? <span className="muted small">Réponse {hours}.</span> : null}
            </>
          ) : null}
          <a className="help-faq" href={href('aide')} onClick={() => setOpen(false)}>Questions fréquentes</a>
        </div>
      ) : null}
      <button type="button" className="help-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Fermer l’aide' : 'Aide et urgence'}>
        {open ? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>
        )}
        <span>{open ? 'Fermer' : 'Aide · Urgence'}</span>
      </button>
    </div>
  );
}
