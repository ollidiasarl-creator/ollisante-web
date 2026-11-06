import { Emblem } from '../brand';
import { href } from '../router';

/** Vitrine : la prise de rendez-vous n'est pas encore ouverte au public. */
export default function ComingSoon() {
  return (
    <section className="page">
      <div className="wrap narrow stack" style={{ gap: 18, textAlign: 'center', justifyItems: 'center', padding: '24px 0 40px' }}>
        <Emblem size={72} />
        <h1>Ollisanté ouvre bientôt</h1>
        <p className="lead-text">La prise de rendez-vous en ligne sera très prochainement disponible dans votre pays.</p>
        <p className="muted">
          Vous êtes un professionnel ou une structure de santé ?{' '}
          <a href="mailto:info@ollidia.com">Écrivez-nous</a> pour rejoindre Ollisanté dès l’ouverture.
        </p>
        <a className="btn" href={href('')}>Retour à l’accueil</a>
      </div>
    </section>
  );
}
