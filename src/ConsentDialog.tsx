import { useEffect, useState } from 'react';
import { getConsent, setConsent } from './consent';

/** « Vos données, vos choix » : affichée à la première visite, tant que le visiteur n'a pas répondu. */
export function ConsentDialog() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (getConsent() === null) setOpen(true);
  }, []);
  if (!open) return null;
  const choose = (accepted: boolean) => {
    setConsent(accepted ? 'accepted' : 'refused');
    setOpen(false);
  };
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="consent-title">
      <div className="modal card stack consent">
        <h2 id="consent-title">Vos données, vos choix</h2>
        <p>
          Ollisanté utilise uniquement ce qui est nécessaire au site : votre connexion, le pays choisi et le
          fonctionnement hors connexion. Aucune publicité, aucune revente de données.
        </p>
        <p className="muted small">
          Avec votre accord, nous comptons aussi, de façon anonyme, les visites venues de nos affiches.
        </p>
        <div className="row consent-actions">
          <a className="btn ghost" href="/legal/confidentialite.html">En savoir plus</a>
          <button type="button" className="btn secondary" onClick={() => choose(false)}>Refuser</button>
          <button type="button" className="btn" onClick={() => choose(true)}>Accepter</button>
        </div>
      </div>
    </div>
  );
}
