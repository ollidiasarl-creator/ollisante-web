import { getFaq } from './api';
import { useLoad } from './hooks';
import { href } from './router';

export function HelpIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" /><path d="M12 17h.01" />
    </svg>
  );
}

/** Colonne « Centre d'aide » du bas de page : son titre mène au Centre d'aide, suivi des questions les plus posées. */
export function FooterHelp() {
  const faq = useLoad(getFaq, []);
  return (
    <div>
      <a className="foot-title" href={href('aide')}>Centre d’aide</a>
      {(faq.data ?? []).slice(0, 3).map((f) => (
        <a key={f.id} href={href('aide', { question: f.id })}>{f.questionFr}</a>
      ))}
    </div>
  );
}
