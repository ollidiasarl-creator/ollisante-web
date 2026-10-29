import { href } from './router';

/** À la place des créneaux pour un visiteur non connecté : les disponibilités ne se voient qu'une fois connecté. */
export function LoginToBook({ practitionerId }: { practitionerId: string }) {
  const suite = `#/medecin/${practitionerId}`;
  return (
    <div className="login-to-book">
      <p><strong>Disponibilités et réservation</strong></p>
      <p className="muted small">Connectez-vous pour voir les créneaux libres de ce professionnel et réserver. L’inscription est gratuite.</p>
      <div className="row">
        <a className="btn small" href={href('connexion/patient', { suite })}>Se connecter</a>
        <a className="btn secondary small" href={href('connexion/patient', { inscription: '1', suite })}>Créer mon compte</a>
      </div>
    </div>
  );
}
