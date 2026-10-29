import { FormEvent, useState } from 'react';
import {
  ApiError, LoginChallenge, errorText, forgotPassword, loginWithPassword, requestSmsCode, resetPassword, startSignup,
  verifyLogin, verifySignup, verifySmsCode,
} from './api';
import { ErrorBox, Field, PhoneInput, useCountries } from './components';
import { isEmail, toInternational } from './format';

type Mode = 'login' | 'signup' | 'sms' | 'forgot';

/** Connexion ou création d'un compte patient (e-mail + code de confirmation, ou numéro + code SMS). */
export function AuthPanel({ intro }: { intro?: string }) {
  const [mode, setMode] = useState<Mode>('login');
  return (
    <div className="card stack">
      {intro ? <p className="muted">{intro}</p> : null}
      <div className="tabs" role="tablist">
        {([['login', 'J’ai déjà un compte'], ['signup', 'Créer un compte'], ['sms', 'Par SMS']] as const).map(([m, label]) => (
          <button key={m} role="tab" aria-selected={mode === m} className={`tab${mode === m ? ' on' : ''}`} onClick={() => setMode(m)}>
            {label}
          </button>
        ))}
      </div>
      {mode === 'login' ? <Login onForgot={() => setMode('forgot')} /> : null}
      {mode === 'signup' ? <Signup onPhone={() => setMode('sms')} /> : null}
      {mode === 'sms' ? <Sms /> : null}
      {mode === 'forgot' ? <Forgot onBack={() => setMode('login')} /> : null}
    </div>
  );
}

function Login({ onForgot }: { onForgot: () => void }) {
  const [challenge, setChallenge] = useState<LoginChallenge | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setChallenge(await loginWithPassword(email.trim().toLowerCase(), password));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  if (challenge) return <CodeStep challenge={challenge} onBack={() => setChallenge(null)} />;
  return (
    <form className="stack" onSubmit={submit}>
      <Field label="Adresse e-mail" required>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
      </Field>
      <Field label="Mot de passe" required>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </Field>
      <ErrorBox text={error} />
      <button className="btn" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</button>
      <button type="button" className="btn ghost" onClick={onForgot}>Mot de passe oublié ?</button>
    </form>
  );
}

/** Double authentification : le code reçu par e-mail, et « ne plus demander sur ce navigateur ». */
export function CodeStep({ challenge, onBack }: { challenge: LoginChallenge; onBack: () => void }) {
  const [code, setCode] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await verifyLogin(challenge.challengeId, code, remember);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="stack" onSubmit={submit}>
      <p>Double authentification : un code de connexion vient d’être envoyé à <strong>{challenge.emailHint}</strong>.</p>
      <Field label="Code reçu par e-mail" required>
        <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" required />
      </Field>
      <label className="check"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /><span>Faire confiance à ce navigateur pendant 30 jours</span></label>
      <ErrorBox text={error} />
      <button className="btn" disabled={busy || code.length !== 6}>{busy ? 'Vérification…' : 'Valider'}</button>
      <button type="button" className="btn ghost" onClick={onBack}>Retour</button>
    </form>
  );
}

export function Signup({ onPhone }: { onPhone: () => void }) {
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [accepted, setAccepted] = useState(false);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const body = () => ({ firstName: f.firstName.trim(), lastName: f.lastName.trim(), email: f.email.trim().toLowerCase(), password: f.password });

  async function start(e: FormEvent) {
    e.preventDefault();
    if (!isEmail(f.email)) return setError('Saisissez une adresse e-mail valide.');
    if (f.password.length < 8) return setError('Le mot de passe doit contenir au moins 8 caractères.');
    if (!accepted) return setError('Vous devez accepter les conditions pour continuer.');
    setBusy(true);
    setError(null);
    try {
      await startSignup(body());
      setSent(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirm(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await verifySignup(body().email, code);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    try {
      await startSignup(body());
      setInfo('Un nouveau code vient de vous être envoyé.');
    } catch (err) {
      setError(errorText(err));
    }
  }

  if (sent) {
    return (
      <form className="stack" onSubmit={confirm}>
        <p>Nous avons envoyé un code à 6 chiffres à <strong>{body().email}</strong>. Saisissez-le pour créer votre compte.</p>
        <Field label="Code reçu par e-mail" required hint="Rien reçu ? Regardez dans vos courriers indésirables. Le code est valable 15 minutes.">
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric"
            autoComplete="one-time-code" required autoFocus />
        </Field>
        {info ? <div className="notice">{info}</div> : null}
        <ErrorBox text={error} />
        <button className="btn" disabled={busy || code.length !== 6}>{busy ? 'Vérification…' : 'Créer mon compte'}</button>
        <button type="button" className="btn ghost" onClick={() => void resend()}>Renvoyer le code</button>
        <button type="button" className="btn secondary" onClick={onPhone}>Utiliser plutôt mon numéro de téléphone</button>
      </form>
    );
  }

  return (
    <form className="stack" onSubmit={start}>
      <div className="grid2" style={{ gap: 12 }}>
        <Field label="Prénom" required><input value={f.firstName} onChange={set('firstName')} autoComplete="given-name" required /></Field>
        <Field label="Nom" required><input value={f.lastName} onChange={set('lastName')} autoComplete="family-name" required /></Field>
      </div>
      <Field label="Adresse e-mail" required><input type="email" value={f.email} onChange={set('email')} autoComplete="email" required /></Field>
      <Field label="Mot de passe" required hint="8 caractères minimum">
        <input type="password" value={f.password} onChange={set('password')} autoComplete="new-password" required />
      </Field>
      <Terms checked={accepted} onChange={setAccepted} />
      <ErrorBox text={error} />
      <button className="btn" disabled={busy}>{busy ? 'Envoi du code…' : 'Recevoir mon code de confirmation'}</button>
    </form>
  );
}

export function Sms() {
  const countries = useCountries();
  const [country, setCountry] = useState('SN');
  const [number, setNumber] = useState('');
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [needNames, setNeedNames] = useState(false);
  const [names, setNames] = useState({ firstName: '', lastName: '' });
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: FormEvent) {
    e.preventDefault();
    const dial = countries.find((c) => c.code === country)?.dialCode ?? '';
    const p = toInternational(dial, number);
    if (!p) return setError('Numéro de téléphone invalide.');
    setBusy(true);
    setError(null);
    try {
      await requestSmsCode(p);
      setPhone(p);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    if (!phone) return;
    if (needNames && !accepted) return setError('Vous devez accepter les conditions pour continuer.');
    setBusy(true);
    setError(null);
    try {
      await verifySmsCode({ phone, code, ...(needNames ? { firstName: names.firstName.trim(), lastName: names.lastName.trim() } : {}) });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NOM_REQUIS') setNeedNames(true);
      else setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  if (!phone) {
    return (
      <form className="stack" onSubmit={send}>
        <p className="muted">Nous vous envoyons un code par SMS. Pas de mot de passe à retenir.</p>
        <Field label="Numéro de téléphone" required>
          <PhoneInput country={country} onCountry={setCountry} value={number} onChange={setNumber} required />
        </Field>
        <ErrorBox text={error} />
        <button className="btn" disabled={busy}>{busy ? 'Envoi…' : 'Recevoir le code par SMS'}</button>
      </form>
    );
  }
  return (
    <form className="stack" onSubmit={verify}>
      <p>Nous avons envoyé un code au <strong>{phone}</strong>.</p>
      <Field label="Code reçu par SMS" required>
        <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric"
          autoComplete="one-time-code" required autoFocus />
      </Field>
      {needNames ? (
        <>
          <p><strong>Dernière étape : votre nom</strong></p>
          <div className="grid2" style={{ gap: 12 }}>
            <Field label="Prénom" required><input value={names.firstName} onChange={(e) => setNames({ ...names, firstName: e.target.value })} required /></Field>
            <Field label="Nom" required><input value={names.lastName} onChange={(e) => setNames({ ...names, lastName: e.target.value })} required /></Field>
          </div>
          <Terms checked={accepted} onChange={setAccepted} />
        </>
      ) : null}
      <ErrorBox text={error} />
      <button className="btn" disabled={busy || code.length !== 6}>{busy ? 'Vérification…' : needNames ? 'Créer mon compte' : 'Valider'}</button>
      <button type="button" className="btn ghost" onClick={() => { setPhone(null); setCode(''); }}>Changer de numéro</button>
    </form>
  );
}

export function Forgot({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  async function reset(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError('Le mot de passe doit contenir au moins 8 caractères.');
    setBusy(true);
    setError(null);
    try {
      await resetPassword(email.trim().toLowerCase(), code, password);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  return sent ? (
    <form className="stack" onSubmit={reset}>
      <p>Si un compte existe avec <strong>{email}</strong>, un code vient d’y être envoyé.</p>
      <Field label="Code reçu par e-mail" required>
        <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" required />
      </Field>
      <Field label="Nouveau mot de passe" required hint="8 caractères minimum">
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
      </Field>
      <ErrorBox text={error} />
      <button className="btn" disabled={busy || code.length !== 6}>Enregistrer et me connecter</button>
    </form>
  ) : (
    <form className="stack" onSubmit={send}>
      <Field label="Adresse e-mail de votre compte" required>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Field>
      <ErrorBox text={error} />
      <button className="btn" disabled={busy}>Recevoir un code</button>
      <button type="button" className="btn ghost" onClick={onBack}>Retour</button>
    </form>
  );
}

export function Terms({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        J’accepte les <a href="/legal/cgu.html" target="_blank" rel="noreferrer">conditions d’utilisation</a> et la{' '}
        <a href="/legal/confidentialite.html" target="_blank" rel="noreferrer">politique de confidentialité</a>, et le traitement
        de mes données de santé nécessaire au service.
      </span>
    </label>
  );
}
