import { askProfile } from './CountryGate';
import { href } from './router';
import { SearchBar } from './SearchForm';

/**
 * Bandeau d'accueil animé (démo) : fond vert profond en mouvement lent, titre qui apparaît ligne par ligne, la
 * recherche, deux boutons d'action, et l'application qui flotte dans un téléphone. Les animations s'arrêtent pour les
 * personnes qui ont demandé moins de mouvement à leur appareil.
 */
export function HeroAnimated({ countryCount }: { countryCount: number }) {
  return (
    <section className="hero-anim">
      <span className="ha-glow ha-glow-1" aria-hidden="true" />
      <span className="ha-glow ha-glow-2" aria-hidden="true" />
      <span className="ha-grid" aria-hidden="true" />
      <div className="wrap ha-inner">
        <div className="ha-copy">
          <span className="ha-badge ha-in" style={{ animationDelay: '0ms' }}><span className="ha-dot" />Rendez-vous médical en ligne</span>
          <h1>
            <span className="ha-in" style={{ animationDelay: '120ms' }}>Votre rendez-vous médical,</span>{' '}
            <span className="ha-in ha-gold" style={{ animationDelay: '260ms' }}>simplement.</span>
          </h1>
          <p className="ha-lead ha-in" style={{ animationDelay: '400ms' }}>
            Trouvez un médecin ou une structure de santé vérifiés près de chez vous, et réservez votre consultation en
            quelques clics, à toute heure.
          </p>
          <div className="ha-in ha-search" style={{ animationDelay: '520ms' }}><SearchBar /></div>
          <div className="ha-actions ha-in" style={{ animationDelay: '640ms' }}>
            <button type="button" className="btn ha-primary" onClick={() => askProfile('patient')}>Prendre rendez-vous</button>
            <a className="btn ha-ghost" href={href('orientation')}>Quel médecin consulter ?</a>
          </div>
          <ul className="ha-trust ha-in" style={{ animationDelay: '760ms' }}>
            <li>Médecins vérifiés</li>
            <li>Réservation 24 h/24</li>
            <li>{countryCount ? `${countryCount} pays` : 'Plusieurs pays'}</li>
          </ul>
        </div>
        <div className="ha-phone-wrap ha-in" style={{ animationDelay: '300ms' }} aria-hidden="true">
          <div className="ha-phone">
            <img src="/site/appli-accueil.jpg" alt="" width="482" height="900" />
          </div>
          <span className="ha-chip ha-chip-1">✓ Rendez-vous confirmé</span>
          <span className="ha-chip ha-chip-2">🔔 Rappel la veille</span>
        </div>
      </div>
    </section>
  );
}
