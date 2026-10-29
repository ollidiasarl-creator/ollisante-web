import { useCountries } from '../components';
import { flag } from '../format';

/** Urgence médicale : rappel d'appeler les secours et numéros vérifiés par l'équipe OLIDIA. */
export default function Emergency() {
  const countries = useCountries().filter((c) => c.emergencyNumber);
  return (
    <div className="page">
      <div className="wrap narrow stack">
        <h1>Urgence médicale</h1>
        <div className="urgent-note" style={{ fontSize: 16 }}>
          <strong>En cas d’urgence, appelez immédiatement les secours</strong> : détresse respiratoire, douleur dans la
          poitrine, perte de connaissance, hémorragie, accident… Ou rendez-vous aux urgences les plus proches.
          N’attendez pas de réponse sur Ollisanté.
        </div>
        {countries.length ? (
          <div className="stack">
            {countries.map((c) => (
              <a key={c.code} className="btn danger block" href={`tel:${c.emergencyNumber!.replace(/\s/g, '')}`}>
                {flag(c.code)} {c.nameFr} : appeler le {c.emergencyNumber}
              </a>
            ))}
          </div>
        ) : <p>Composez le numéro d’urgence de votre pays.</p>}
        <p className="small muted">Ollisanté n’est pas un service d’urgence. Les numéros affichés sont vérifiés par notre équipe.</p>
      </div>
    </div>
  );
}
