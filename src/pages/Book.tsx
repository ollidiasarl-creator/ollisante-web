import { FormEvent, useState } from 'react';
import { Appointment, ApiError, PaymentMethod, errorText, getFacilities, getPractitioner, getRelatives, getSlots, book } from '../api';
import { AuthPanel } from '../Auth';
import { ErrorBox, Field, useCountries } from '../components';
import { dayLong, isoDate, money, time } from '../format';
import { useLoad, useSession } from '../hooks';
import { PaymentPanel } from '../Payment';
import { go, href } from '../router';

/** Réservation : connexion si besoin, récapitulatif et motif, confirmation, puis paiement le cas échéant. */
export default function Book({ practitionerId, startsAt }: { practitionerId: string; startsAt: string }) {
  const user = useSession();
  const p = useLoad(() => getPractitioner(practitionerId), [practitionerId]);
  const day = startsAt ? isoDate(new Date(startsAt)) : '';
  const slot = useLoad(
    async () => (day ? (await getSlots(practitionerId, day, day)).find((s) => s.startsAt === startsAt) ?? null : null),
    [practitionerId, startsAt],
  );
  const facilities = useLoad(() => (p.data ? getFacilities(p.data.countryCode) : Promise.resolve([])), [p.data?.countryCode]);
  const countries = useCountries();
  const [reason, setReason] = useState('');
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  // Pour qui : soi-même ou l'un de ses proches (Compte → Mes informations → Mes proches).
  const relatives = useLoad(() => (user?.user.role === 'PATIENT' ? getRelatives() : Promise.resolve([])), [user?.user.id]);
  const [relativeId, setRelativeId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [done, setDone] = useState(false);

  async function confirm(e: FormEvent) {
    e.preventDefault();
    if (hasFee && !method) {
      setError('Choisissez un moyen de paiement.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const a = await book({
        practitionerId, startsAt, mode: 'IN_PERSON', reason: reason.trim() || undefined,
        paymentMethod: hasFee ? method ?? undefined : undefined,
        relativeId: relativeId || undefined,
      });
      setAppointment(a);
      if (a.status !== 'PENDING_PAYMENT') setDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CRENEAU_INDISPONIBLE') {
        setError('Ce créneau vient d’être pris. Choisissez-en un autre.');
      } else setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const d = p.data;
  const country = d ? countries.find((c) => c.code === d.countryCode) : undefined;
  const hasFee = d?.consultationFeeMinor != null && d.consultationFeeMinor > 0 && !!d.feeCurrency;
  // Moyens de paiement activés pour le pays dans le centre d'administration ; le patient doit en choisir un.
  const methods: { id: PaymentMethod; title: string; text: string }[] = [
    ...(country?.onlinePayment ? [{ id: 'MOBILE_MONEY' as const, title: 'Payer maintenant par Mobile Money',
      text: 'Orange Money, MTN, Moov… selon votre pays. Le rendez-vous est confirmé dès le paiement.' }] : []),
    ...(country?.onSitePayment !== false ? [{ id: 'ON_SITE' as const, title: 'Payer sur place',
      text: 'Le jour du rendez-vous, directement auprès du professionnel.' }] : []),
  ];
  const fee = hasFee ? money(d!.consultationFeeMinor!, d!.feeCurrency!) : '';
  const place = slot.data ? facilities.data?.find((f) => f.id === slot.data!.facilityId) : undefined;

  if (done && appointment) {
    return (
      <div className="page"><div className="wrap narrow stack">
        <h1>Rendez-vous confirmé ✓</h1>
        <div className="summary">
          <strong>Dr {appointment.practitionerName}</strong>
          <span>{dayLong(appointment.startsAt)}, {time(appointment.startsAt)}</span>
          {appointment.facilityName ? <span className="muted">{appointment.facilityName}</span> : null}
          {appointment.paymentMode === 'ON_SITE' && appointment.priceMinor != null && appointment.priceCurrency
            ? <span>À régler sur place : {money(appointment.priceMinor, appointment.priceCurrency)}</span> : null}
          {appointment.paymentMode === 'ONLINE' ? <span>Payé par Mobile Money</span> : null}
        </div>
        <p className="muted">Retrouvez ce rendez-vous dans « Mes rendez-vous », sur ce site ou dans l’application Ollisanté, avec le même compte.</p>
        <div className="row"><a className="btn" href={href('compte')}>Mes rendez-vous</a><a className="btn secondary" href={href('')}>Retour à l’accueil</a></div>
      </div></div>
    );
  }

  return (
    <div className="page">
      <div className="wrap narrow stack">
        <p className="small"><a href={href(`medecin/${practitionerId}`)}>← Choisir un autre horaire</a></p>
        <h1>Votre rendez-vous</h1>
        {d && slot.data && !appointment ? (
          <div className="summary">
            <strong>Dr {d.firstName} {d.lastName}</strong>
            <span className="muted">{d.specialties.map((s) => s.nameFr).join(', ')}</span>
            <span>{dayLong(slot.data.startsAt)}, {time(slot.data.startsAt)}</span>
            {place ? <span>{[place.name, place.address, place.city].filter(Boolean).join(', ')}</span> : null}
            {d.consultationFeeMinor != null && d.feeCurrency ? <span>Consultation : <strong>{money(d.consultationFeeMinor, d.feeCurrency)}</strong></span> : null}
          </div>
        ) : null}
        {slot.data === null && !slot.loading ? (
          <div className="stack">
            <ErrorBox text="Ce créneau n’est plus disponible." />
            <button className="btn secondary" onClick={() => go(`medecin/${practitionerId}`)}>Voir les autres disponibilités</button>
          </div>
        ) : null}

        {appointment && appointment.status === 'PENDING_PAYMENT' ? (
          <PaymentPanel appointment={appointment} onPaid={() => setDone(true)} />
        ) : !user ? (
          <AuthPanel intro="Connectez-vous ou créez votre compte patient pour confirmer ce rendez-vous. Vous retrouverez ensuite ce créneau." />
        ) : user.user.role !== 'PATIENT' ? (
          <ErrorBox text="La prise de rendez-vous est réservée aux comptes patients. Déconnectez-vous depuis « Mes rendez-vous », puis connectez-vous avec un compte patient." />
        ) : slot.data ? (
          <form className="stack" onSubmit={confirm}>
            <Field label="Pour qui est ce rendez-vous ?" required>
              <select value={relativeId} onChange={(e) => setRelativeId(e.target.value)}>
                <option value="">Pour moi</option>
                {(relatives.data ?? []).map((r) => <option key={r.id} value={r.id}>Pour {r.firstName} {r.lastName}</option>)}
              </select>
            </Field>
            <p className="small muted" style={{ marginTop: -8 }}><a href={href('compte/informations')}>Ajouter un proche</a> (enfant, parent…) dans Mes informations.</p>
            <Field label="Motif de consultation (facultatif)" hint="Visible uniquement par le professionnel.">
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} placeholder="Ex. : douleurs au dos depuis une semaine" />
            </Field>
            {hasFee ? (
              <fieldset className="pay-choice">
                <legend>Moyen de paiement ({fee})<span className="req">*</span></legend>
                {methods.map((m) => (
                  <label key={m.id} className={`pay-option${method === m.id ? ' on' : ''}`}>
                    <input type="radio" name="pay" checked={method === m.id} onChange={() => setMethod(m.id)} required />
                    <span><strong>{m.title}</strong><span className="muted small">{m.text}</span></span>
                  </label>
                ))}
                {methods.length === 0 ? <ErrorBox text="La réservation en ligne n’est pas encore ouverte dans ce pays." /> : null}
              </fieldset>
            ) : null}
            <ErrorBox text={error} />
            <button className="btn" disabled={busy || (hasFee && methods.length === 0)}>
              {busy ? 'Réservation…' : method === 'MOBILE_MONEY' ? 'Confirmer et payer' : 'Confirmer le rendez-vous'}
            </button>
            <p className="small muted">Les horaires sont affichés à l’heure de votre ordinateur.</p>
          </form>
        ) : null}
      </div>
    </div>
  );
}
