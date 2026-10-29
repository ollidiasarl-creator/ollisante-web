import { Emblem, SHOWCASE, StoreBadges } from '../brand';

/** Télécharger l'application : patients et médecins (les structures ont aussi leur espace web). */
export default function AppDownload() {
  return (
    <section className="page">
      <div className="wrap narrow stack" style={{ gap: 22 }}>
        <div className="row" style={{ gap: 14 }}>
          <Emblem size={56} />
          <h1>L’application Ollisanté</h1>
        </div>
        <p className="lead-text">{SHOWCASE ? 'Bientôt disponible, gratuitement, sur iPhone et Android.' : 'Gratuite sur iPhone et Android.'}</p>
        <StoreBadges />
        <div className="grid2">
          <div className="tile">
            <h3>Patients</h3>
            <p className="muted">Prenez rendez-vous, payez par Mobile Money et retrouvez vos consultations.</p>
          </div>
          <div className="tile">
            <h3>Médecins</h3>
            <p className="muted">Ouvrez vos horaires et suivez vos rendez-vous. Profil vérifié par notre équipe.</p>
          </div>
        </div>
        {SHOWCASE ? null : <p className="muted small">Vous représentez une structure de santé ? <a href="/structure/">Ouvrir l’Espace Structure</a></p>}
      </div>
    </section>
  );
}
