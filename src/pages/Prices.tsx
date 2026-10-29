import { useLockedCountry } from '../brand';
import { useCountries } from '../components';
import { flag, money } from '../format';
import { href } from '../router';

/** Tarifs : prix d'une consultation par pays (fixé dans le centre d'administration) et mode de paiement. */
export default function Prices() {
  const countries = useCountries();
  const locked = useLockedCountry();
  const priced = countries.filter((c) => c.defaultFeeMinor != null && c.defaultFeeMinor > 0 && (!locked || c.code === locked));
  return (
    <section className="page">
      <div className="wrap">
        <h1>Tarifs</h1>
        <p className="muted" style={{ margin: '8px 0 20px' }}>Prix d’une consultation, affiché avant de confirmer votre rendez-vous.</p>
        {countries.length === 0 ? <div className="spinner" aria-label="Chargement" /> : null}
        <ul className="prices">
          {priced.map((c) => (
            <li key={c.code}>
              <a className="price-card" href={href('recherche', { pays: c.code })}>
                <span className="price-country"><span className="flag" aria-hidden="true">{flag(c.code)}</span>{c.nameFr}</span>
                <strong className="price-amount">{money(c.defaultFeeMinor!, c.currency)}</strong>
                <span className="pay-badges">
                  {c.onlinePayment ? <span className="badge">Mobile Money</span> : null}
                  {c.onSitePayment ? <span className="badge muted-badge">Sur place</span> : null}
                </span>
              </a>
            </li>
          ))}
        </ul>
        <p className="muted small" style={{ marginTop: 20 }}>
          Annulation plus de 24 h avant : remboursement complet. Les conditions détaillées sont dans les{' '}
          <a href="/legal/cgu.html">conditions d’utilisation</a>.
        </p>
      </div>
    </section>
  );
}
