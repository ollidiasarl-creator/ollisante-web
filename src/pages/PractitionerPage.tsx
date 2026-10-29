import { ReportLink } from '../Trust';
import { Slot, getFacilities, getPractitioner } from '../api';
import { Agenda, ErrorBox } from '../components';
import { flag, initials, money } from '../format';
import { useLoad, useSession } from '../hooks';
import { LoginToBook } from '../LoginToBook';
import { go, href } from '../router';

export default function PractitionerPage({ id }: { id: string }) {
  const user = useSession();
  const p = useLoad(() => getPractitioner(id), [id]);
  const facilities = useLoad(() => (p.data ? getFacilities(p.data.countryCode) : Promise.resolve([])), [p.data?.countryCode]);
  const pick = (s: Slot) => go(`rdv/${id}`, { creneau: s.startsAt });

  if (p.error) return <div className="page"><div className="wrap"><ErrorBox text="Ce professionnel n’est pas (ou plus) disponible sur Ollisanté." /></div></div>;
  if (!p.data) return <div className="page"><div className="spinner" /></div>;
  const d = p.data;
  return (
    <div className="page">
      <div className="wrap">
        <p className="small"><a href={href('recherche', { pays: d.countryCode })}>← Tous les professionnels</a></p>
        <div className="profile" style={{ marginTop: 12 }}>
          <div className="card stack">
            <div className="who">
              <div className="avatar" aria-hidden>{initials(d.firstName, d.lastName)}</div>
              <div className="stack" style={{ gap: 4 }}>
                <h1 style={{ fontSize: 24 }}>Dr {d.firstName} {d.lastName}</h1>
                <span className="muted">{d.specialties.map((s) => s.nameFr).join(', ')}</span>
                <span><span className="badge">Profil vérifié</span></span>
              </div>
            </div>
            <p>{flag(d.countryCode)} {d.consultationFeeMinor != null && d.feeCurrency ? <>Consultation : <strong>{money(d.consultationFeeMinor, d.feeCurrency)}</strong></> : 'Tarif communiqué sur place'}</p>
            {d.bio ? <p style={{ whiteSpace: 'pre-line' }}>{d.bio}</p> : null}
            <p className="small muted">Le lieu de chaque créneau s’affiche au moment de la confirmation.</p>
            <ReportLink targetType="PRACTITIONER" targetId={id} />
          </div>
          <div className="card">
            <h2 style={{ fontSize: 20, marginBottom: 12 }}>Prendre rendez-vous</h2>
            {user ? (
              <Agenda practitionerId={id} days={7} perDay={8} facilities={facilities.data ?? []} onPick={pick} />
            ) : (
              <LoginToBook practitionerId={id} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
