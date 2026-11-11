import { PhotoBanner } from '../PhotoBanner';
import { useEffect, useState } from 'react';
import { Specialty, getSpecialties } from '../api';
import { useCountry, useLockedCountry } from '../brand';
import { useCountries } from '../components';
import { askCountry } from '../CountryGate';
import { href } from '../router';
import { DISCLAIMER, DURATIONS, REASONS, RED_FLAGS, WHO, Who, specialtiesFor } from '../triage';

type Step = 'who' | 'flags' | 'reason' | 'duration' | 'result' | 'urgent';

/** « Quel médecin consulter ? » : 4 questions, puis une spécialité et un délai, ou les secours. */
export default function Triage() {
  const [step, setStep] = useState<Step>('who');
  const [who, setWho] = useState<Who | null>(null);
  const [reason, setReason] = useState<number | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const countries = useCountries();
  const [chosen] = useCountry();
  const locked = useLockedCountry();
  const country = countries.find((c) => c.code === (locked ?? chosen));
  useEffect(() => {
    getSpecialties().then(setSpecialties).catch(() => undefined);
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  const restart = () => {
    setWho(null);
    setReason(null);
    setDuration(null);
    setStep('who');
  };
  const n = { who: 1, flags: 2, reason: 3, duration: 4, result: 4, urgent: 2 }[step];
  const advice = DURATIONS.find((d) => d.id === duration)?.advice;
  const codes = who !== null && reason !== null ? specialtiesFor(REASONS[reason], who) : [];
  const named = codes.map((c) => specialties.find((s) => s.code === c)).filter((s): s is Specialty => !!s);

  return (
    <div className="page">
      <div className="wrap triage">
        <PhotoBanner theme="orientation" />
        <p className="triage-kicker">Quel médecin consulter ?</p>
        {step !== 'result' && step !== 'urgent' ? <div className="triage-progress"><span style={{ width: `${n * 25}%` }} /></div> : null}

        {step === 'who' ? (
          <section className="stack">
            <h1>Pour qui ?</h1>
            <div className="triage-options">
              {WHO.map((w) => (
                <button key={w.id} type="button" onClick={() => { setWho(w.id); setStep('flags'); }}>{w.label}</button>
              ))}
            </div>
          </section>
        ) : null}

        {step === 'flags' && who ? (
          <section className="stack">
            <h1>Y a-t-il un de ces signes en ce moment ?</h1>
            <div className="triage-options danger">
              {RED_FLAGS.filter((f) => f.who.includes(who)).map((f) => (
                <button key={f.label} type="button" onClick={() => setStep('urgent')}>{f.label}</button>
              ))}
            </div>
            <button type="button" className="btn" onClick={() => setStep('reason')}>Aucun de ces signes</button>
          </section>
        ) : null}

        {step === 'reason' ? (
          <section className="stack">
            <h1>Quel est le motif principal ?</h1>
            <div className="triage-options">
              {REASONS.map((r, i) => (
                <button key={r.label} type="button" onClick={() => { setReason(i); setStep('duration'); }}>{r.label}</button>
              ))}
            </div>
          </section>
        ) : null}

        {step === 'duration' ? (
          <section className="stack">
            <h1>Depuis quand ?</h1>
            <div className="triage-options">
              {DURATIONS.map((d) => (
                <button key={d.id} type="button" onClick={() => { setDuration(d.id); setStep('result'); }}>{d.label}</button>
              ))}
            </div>
          </section>
        ) : null}

        {step === 'urgent' ? (
          <section className="stack">
            <div className="urgent-note triage-urgent">
              <h1>Appelez les secours maintenant</h1>
              <p>N’attendez pas de rendez-vous : appelez ou rendez-vous aux urgences les plus proches.</p>
              {country?.emergencyNumber ? (
                <a className="btn danger block" href={`tel:${country.emergencyNumber.replace(/\s/g, '')}`}>Appeler le {country.emergencyNumber} ({country.nameFr})</a>
              ) : (
                <a className="btn danger block" href={href('urgence')}>Numéros d’urgence par pays</a>
              )}
            </div>
          </section>
        ) : null}

        {step === 'result' ? (
          <section className="stack">
            <h1>Nous vous conseillons de consulter</h1>
            <div className="triage-result">
              {named.map((s, i) => (
                <button key={s.code} type="button" className={i === 0 ? 'main' : undefined} onClick={() => askCountry(s)}>
                  <strong>{s.nameFr}</strong>
                  <span>{i === 0 ? 'Trouver un médecin →' : 'Autre possibilité →'}</span>
                </button>
              ))}
            </div>
            {advice ? <p className="notice">{advice}</p> : null}
          </section>
        ) : null}

        <div className="row triage-actions">
          {step !== 'who' ? <button type="button" className="btn ghost small" onClick={restart}>Recommencer</button> : null}
        </div>
        <p className="muted small">{DISCLAIMER}</p>
      </div>
    </div>
  );
}
