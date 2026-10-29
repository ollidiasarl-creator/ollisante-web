import { FormEvent, useEffect, useRef, useState } from 'react';
import { Appointment, Operator, Payment, errorText, getPayment, operators, pay } from './api';
import { ErrorBox, Field, PhoneInput, useCountries } from './components';
import { dayLong, money, time, toInternational } from './format';

const FAILURES: Record<string, string> = {
  INSUFFICIENT_BALANCE: 'Solde insuffisant sur ce compte Mobile Money.',
  PAYER_LIMIT_REACHED: 'Limite de paiement atteinte sur ce compte Mobile Money.',
  PAYMENT_NOT_APPROVED: 'Le paiement n’a pas été validé sur le téléphone.',
  PAYER_NOT_FOUND: 'Ce numéro n’a pas de compte Mobile Money chez cet opérateur.',
  PAYMENT_IN_PROGRESS: 'Un autre paiement est en cours sur ce compte. Réessayez dans quelques minutes.',
};

/** Paiement Mobile Money : choix de l'opérateur, numéro, puis validation sur le téléphone du patient. */
export function PaymentPanel({ appointment, onPaid }: { appointment: Appointment; onPaid: () => void }) {
  const countries = useCountries();
  const [ops, setOps] = useState<Operator[] | null>(null);
  const [operator, setOperator] = useState('');
  const [country, setCountry] = useState(appointment.practitionerCountryCode);
  const [number, setNumber] = useState('');
  const [payment, setPayment] = useState<Payment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slow, setSlow] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    operators(appointment.practitionerCountryCode)
      .then((o) => {
        setOps(o);
        if (o.length === 1) setOperator(o[0].code);
      })
      .catch((e) => setError(errorText(e)));
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [appointment.practitionerCountryCode]);

  function poll(id: string, n: number) {
    timer.current = window.setTimeout(async () => {
      try {
        const p = await getPayment(id);
        setPayment(p);
        if (p.status === 'SUCCEEDED') return onPaid();
        if (p.status !== 'PENDING') return;
      } catch {
        // réseau instable : on réessaie
      }
      if (n < 60) poll(id, n + 1);
      else setSlow(true);
    }, 3000);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const dial = countries.find((c) => c.code === country)?.dialCode ?? '';
    const phone = toInternational(dial, number);
    if (!operator) return setError('Choisissez votre opérateur.');
    if (!phone) return setError('Numéro Mobile Money invalide.');
    setBusy(true);
    setError(null);
    setSlow(false);
    try {
      const p = await pay(appointment.id, phone, operator);
      setPayment(p);
      if (p.status === 'SUCCEEDED') onPaid();
      else if (p.status === 'PENDING') poll(p.id, 0);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const amount = appointment.priceMinor != null && appointment.priceCurrency ? money(appointment.priceMinor, appointment.priceCurrency) : '';
  const waiting = payment?.status === 'PENDING' && !slow;
  return (
    <div className="stack">
      <div className="summary">
        <span className="amount">{amount}</span>
        <span>Dr {appointment.practitionerName}</span>
        <span className="muted">{dayLong(appointment.startsAt)}, {time(appointment.startsAt)}</span>
      </div>
      {waiting ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="spinner" />
          <h3>Validez le paiement sur votre téléphone</h3>
          <p className="muted">Une demande de paiement vient d’être envoyée. Saisissez votre code secret Mobile Money sur votre téléphone pour confirmer.</p>
        </div>
      ) : (
        <form className="stack" onSubmit={submit}>
          {slow ? <div className="notice">Le paiement n’est pas encore confirmé. Si vous l’avez validé, il apparaîtra dans « Mes rendez-vous » d’ici quelques minutes.</div> : null}
          {payment?.status === 'FAILED' ? <ErrorBox text={FAILURES[payment.failureCode ?? ''] ?? 'Le paiement a échoué. Vous pouvez réessayer.'} /> : null}
          {ops && ops.length === 0 ? <ErrorBox text="Le paiement en ligne n’est pas disponible pour ce pays pour le moment." /> : null}
          {ops && ops.length > 0 ? (
            <Field label="Opérateur Mobile Money" required>
              <select value={operator} onChange={(e) => setOperator(e.target.value)} required>
                <option value="">Choisir…</option>
                {ops.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
              </select>
            </Field>
          ) : null}
          <Field label="Numéro Mobile Money" required>
            <PhoneInput country={country} onCountry={setCountry} value={number} onChange={setNumber} required />
          </Field>
          <ErrorBox text={error} />
          <button className="btn" disabled={busy || !ops?.length}>{busy ? 'Envoi…' : payment?.status === 'FAILED' ? 'Réessayer' : `Payer ${amount}`}</button>
          <p className="small muted">Le créneau est réservé 30 minutes. Annulation gratuite jusqu’à 24 h avant le rendez-vous (remboursement de 50 % entre 24 h et 6 h avant).</p>
        </form>
      )}
    </div>
  );
}
