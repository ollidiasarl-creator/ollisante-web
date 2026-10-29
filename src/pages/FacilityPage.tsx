import { ReportLink } from '../Trust';
import { findFacility, getFacilitySpecialties, searchPractitioners } from '../api';
import { ErrorBox } from '../components';
import { flag } from '../format';
import { useLoad } from '../hooks';
import { PractitionerResult } from './Search';

/** Fiche publique d'une structure : ses spécialités et les professionnels qui y consultent. */
export default function FacilityPage({ id }: { id: string }) {
  const facility = useLoad(() => findFacility(id), [id]);
  const specialties = useLoad(() => getFacilitySpecialties(id), [id]);
  const list = useLoad(() => searchPractitioners({ facilityId: id }), [id]);
  if (facility.data === null && !facility.loading) {
    return <div className="page"><div className="wrap"><ErrorBox text="Cette structure n’est pas (ou plus) visible sur Ollisanté." /></div></div>;
  }
  const f = facility.data;
  return (
    <div className="page">
      <div className="wrap stack">
        {f ? (
          <div className="card stack">
            <h1>{f.name}</h1>
            <p className="muted">{flag(f.countryCode)} {[f.address, f.city].filter(Boolean).join(', ')}</p>
            {f.phone ? <p>Téléphone : <a href={`tel:${f.phone}`}>{f.phone}</a></p> : null}
            {specialties.data?.length ? <div className="chips">{specialties.data.map((s) => <span key={s.code} className="chip">{s.nameFr}</span>)}</div> : null}
            <ReportLink targetType="FACILITY" targetId={id} />
          </div>
        ) : <div className="spinner" />}
        <h2 style={{ fontSize: 22 }}>Professionnels qui consultent ici</h2>
        {list.data && list.data.content.length === 0 ? <div className="empty-state card">Aucun professionnel disponible pour le moment.</div> : null}
        {(list.data?.content ?? []).map((p) => <PractitionerResult key={p.id} p={p} facilities={f ? [f] : []} facilityId={id} />)}
      </div>
    </div>
  );
}
