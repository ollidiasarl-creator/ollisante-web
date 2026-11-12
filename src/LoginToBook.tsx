import { href } from './router';
import { abTrack } from './ab';

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

/**
 * Choix d'un horaire : les créneaux sont visibles de tous ; un visiteur se connecte (ou crée son compte)
 * puis arrive directement sur la réservation de cet horaire.
 */
export function bookSlot(practitionerId: string, startsAt: string, signedIn: boolean) {
  abTrack('BOOK');
  const target = href(`rdv/${practitionerId}`, { creneau: startsAt });
  if (signedIn) window.location.hash = target;
  else window.location.hash = href('connexion/patient', { suite: target });
}

/** Sous les créneaux, pour un visiteur : la réservation se confirme après connexion. */
export function GuestBookingNote() {
  return <p className="muted small guest-note">Choisissez un horaire : vous vous connecterez (ou créerez votre compte gratuit) pour confirmer.</p>;
}
