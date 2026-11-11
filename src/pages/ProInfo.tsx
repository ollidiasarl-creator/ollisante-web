import { PhotoBanner } from '../PhotoBanner';
import { href } from '../router';

const INFO = {
  medecin: {
    title: 'Médecins, rejoignez Ollisanté',
    points: ['Une fiche vérifiée, visible par les patients', 'Vos créneaux réservables 24 h/24', 'Un rappel envoyé à vos patients'],
    signup: href('connexion/medecin', { inscription: '1' }), signupLabel: 'Créer mon compte médecin',
    login: href('connexion/medecin'),
  },
  structure: {
    title: 'Structures, rejoignez Ollisanté',
    points: ['Une page pour votre établissement', 'Tous vos rendez-vous au même endroit', 'Vos médecins, gérés par vous'],
    signup: '/structure/#inscription', signupLabel: 'Créer l’espace de ma structure',
    login: '/structure/',
  },
};

/** Présentation courte pour les professionnels, avant l'inscription ou la connexion. */
export default function ProInfo({ profile }: { profile: 'medecin' | 'structure' }) {
  const i = INFO[profile];
  return (
    <div className="page">
      <div className="wrap pro-info">
        <PhotoBanner theme={profile} />
        <h1>{i.title}</h1>
        <ul className="pro-points">
          {i.points.map((p) => <li key={p}>{p}</li>)}
        </ul>
        <p className="muted">Créez votre compte gratuitement.</p>
        <div className="row">
          <a className="btn" href={i.signup}>{i.signupLabel}</a>
          <a className="btn secondary" href={i.login}>Se connecter</a>
        </div>
      </div>
    </div>
  );
}
