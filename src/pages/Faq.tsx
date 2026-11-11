import { PhotoBanner } from '../PhotoBanner';
import { getAppConfig, getFaq } from '../api';
import { HelpIcon } from '../HelpMenu';
import { useLoad } from '../hooks';
import { href } from '../router';

/** Centre d'aide : toutes les questions fréquentes (gérées depuis le centre d'administration) et le contact. */
export default function Faq({ openId }: { openId?: string | null }) {
  const faq = useLoad(getFaq, []);
  const config = useLoad(getAppConfig, []);
  const whatsapp = config.data?.whatsappNumber?.replace(/\D/g, '');
  return (
    <section className="page">
      <div className="wrap narrow" style={{ maxWidth: 820 }}>
        <PhotoBanner theme="aide" />
        <h1 className="row" style={{ marginBottom: 6 }}><HelpIcon size={30} /> Centre d’aide</h1>
        <p className="muted" style={{ marginBottom: 18 }}>Questions fréquentes</p>
        {faq.loading ? <div className="spinner" aria-label="Chargement" /> : null}
        {(faq.data ?? []).map((f) => (
          <details key={f.id} open={f.id === openId}><summary>{f.questionFr}</summary><p>{f.answerFr}</p></details>
        ))}
        <div className="notice" style={{ marginTop: 24 }}>
          Vous ne trouvez pas votre réponse ?{' '}
          {whatsapp ? (
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">Écrivez-nous sur WhatsApp</a>
          ) : (
            <a href="mailto:info@ollidia.com">Écrivez-nous</a>
          )}
          . En cas d’urgence, <a href={href('urgence')}>appelez le numéro d’urgence de votre pays</a>.
        </div>
      </div>
    </section>
  );
}
