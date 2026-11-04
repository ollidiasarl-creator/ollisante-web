import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { LoginChallenge, Specialty, errorText, getSpecialties, loginWithPassword, registerPractitioner, session } from '../api';
import { CodeStep, Forgot, Signup, Sms, Terms } from '../Auth';
import { Emblem } from '../brand';
import { ErrorBox, Field, PhoneInput, useCountries } from '../components';
import { isEmail, toInternational } from '../format';
import { useSession } from '../hooks';
import { go, href } from '../router';

export type LoginProfile = 'patient' | 'medecin' | 'structure';
type View = 'email' | 'phone' | 'signup' | 'forgot';

const LABELS: Record<LoginProfile, { title: string; signup: string; signupTitle: string }> = {
  patient: { title: 'Connexion patient', signup: 'Créer mon compte patient', signupTitle: 'Créer mon compte patient' },
  medecin: { title: 'Connexion médecin', signup: 'Créer mon compte médecin', signupTitle: 'Créer mon compte médecin' },
  structure: { title: 'Connexion structure', signup: 'Inscrire ma structure', signupTitle: 'Inscrire ma structure' },
};

/**
 * Connexion, présentée comme dans l'application : titre, e-mail et mot de passe, « Mot de passe oublié ? »,
 * « Se connecter », puis « Avec mon numéro de téléphone » et la création de compte. Le patient se connecte par
 * téléphone avec un code SMS ; médecin et structure avec leur numéro et leur mot de passe.
 */
export default function Connexion({ profile, next }: { profile: LoginProfile; next?: string | null }) {
  const user = useSession();
  // Lien direct vers l'inscription (affiche et message envoyés aux médecins) : #/connexion/medecin?inscription
  const [view, setView] = useState<View>(() =>
    profile !== 'structure' && new URLSearchParams(window.location.hash.split('?')[1] ?? '').has('inscription') ? 'signup' : 'email');

  useEffect(() => {
    if (!user) return;
    if (user.user.role === 'STRUCTURE') {
      // L'Espace Structure a sa propre session : on la lui confie, puis on y va (une seule session à la fois).
      const s = session.load();
      try {
        sessionStorage.setItem('ollisante-structure-session',
          JSON.stringify({ accessToken: s?.accessToken, refreshToken: s?.refreshToken, email: user.user.email }));
      } catch {
        // sans stockage de session, la structure se reconnecte dans son espace
      }
      session.save(null);
      window.location.href = '/structure/';
      return;
    }
    if (next) window.location.hash = next.startsWith('#') ? next : `#/${next}`;
    else go(user.user.role === 'PATIENT' ? 'recherche' : 'compte');
  }, [user, next]);

  const l = LABELS[profile];
  if (view === 'signup') {
    return (
      <Screen title={l.signupTitle} onBack={() => setView('email')}>
        {profile === 'patient' ? <Signup onPhone={() => setView('phone')} /> : null}
        {profile === 'medecin' ? <ProSignup /> : null}
        <button type="button" className="btn ghost" onClick={() => setView('email')}>J’ai déjà un compte</button>
      </Screen>
    );
  }
  if (view === 'forgot') {
    return (
      <Screen title="Mot de passe oublié" onBack={() => setView('email')}>
        <Forgot onBack={() => setView('email')} />
      </Screen>
    );
  }
  if (view === 'phone') {
    return (
      <Screen
        title={l.title}
        lead={profile === 'patient' ? 'Recevez un code par SMS sur votre numéro.' : 'Saisissez le numéro de téléphone et le mot de passe de votre compte.'}
      >
        {profile === 'patient' ? <Sms /> : <PasswordLogin by="phone" onForgot={() => setView('forgot')} />}
        <button type="button" className="btn secondary" onClick={() => setView('email')}>Avec mon adresse e-mail</button>
        <SignupLink profile={profile} onSignup={() => setView('signup')} />
      </Screen>
    );
  }
  return (
    <Screen title={l.title} lead="Saisissez l’adresse e-mail et le mot de passe de votre compte.">
      <PasswordLogin by="email" onForgot={() => setView('forgot')} />
      <button type="button" className="btn secondary" onClick={() => setView('phone')}>Avec mon numéro de téléphone</button>
      <SignupLink profile={profile} onSignup={() => setView('signup')} />
    </Screen>
  );
}

/** Mise en page de l'écran de connexion de l'application : retour + emblème, titre, texte, contenu. */
function Screen({ title, lead, onBack, children }: { title: string; lead?: string; onBack?: () => void; children: ReactNode }) {
  return (
    <div className="login-screen">
      <div className="login-top">
        {onBack ? (
          <button type="button" className="login-round" aria-label="Retour" onClick={onBack}>‹</button>
        ) : (
          <a className="login-round" aria-label="Retour à l’accueil" href={href('')}>‹</a>
        )}
        <a href={href('')} aria-label="Ollisanté, accueil"><Emblem size={40} /></a>
      </div>
      <h1>{title}</h1>
      {lead ? <p className="login-lead">{lead}</p> : null}
      <div className="stack" style={{ gap: 14 }}>{children}</div>
    </div>
  );
}

function SignupLink({ profile, onSignup }: { profile: LoginProfile; onSignup: () => void }) {
  const label = LABELS[profile].signup;
  return profile === 'structure'
    ? <a className="login-link" href="/structure/#inscription">{label}</a>
    : <button type="button" className="login-link" onClick={onSignup}>{label}</button>;
}

/** E-mail ou numéro de téléphone, avec le mot de passe. */
function PasswordLogin({ by, onForgot }: { by: 'email' | 'phone'; onForgot: () => void }) {
  const countries = useCountries();
  const [challenge, setChallenge] = useState<LoginChallenge | null>(null);
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('SN');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    let identifier = email.trim().toLowerCase();
    if (by === 'phone') {
      const dial = countries.find((c) => c.code === country)?.dialCode ?? '';
      const intl = toInternational(dial, phone);
      if (!intl) return setError('Numéro de téléphone invalide.');
      identifier = intl;
    }
    setBusy(true);
    try {
      setChallenge(await loginWithPassword(identifier, password));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  if (challenge) return <CodeStep challenge={challenge} onBack={() => setChallenge(null)} />;
  return (
    <form className="stack" style={{ gap: 14 }} onSubmit={submit}>
      {by === 'email' ? (
        <Field label="Adresse e-mail">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        </Field>
      ) : (
        <Field label="Numéro de téléphone">
          <PhoneInput country={country} onCountry={setCountry} value={phone} onChange={setPhone} required />
        </Field>
      )}
      <Field label="Mot de passe">
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </Field>
      <button type="button" className="login-link" onClick={onForgot}>Mot de passe oublié ?</button>
      <ErrorBox text={error} />
      <button className="btn" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</button>
    </form>
  );
}

/** Inscription médecin : identité, coordonnées, numéro d'ordre et spécialités ; vérification par l'équipe ensuite. */
function ProSignup() {
  const countries = useCountries();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', phone: '', license: '', password: '' });
  const [country, setCountry] = useState('SN');
  const [codes, setCodes] = useState<string[]>([]);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    getSpecialties().then((l) => setSpecialties([...l].sort((a, b) => a.nameFr.localeCompare(b.nameFr, 'fr')))).catch(() => undefined);
  }, []);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const toggle = (code: string) => setCodes(codes.includes(code) ? codes.filter((c) => c !== code) : [...codes, code]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isEmail(f.email)) return setError('Adresse e-mail invalide.');
    const dial = countries.find((c) => c.code === country)?.dialCode ?? '';
    const phone = toInternational(dial, f.phone);
    if (!phone) return setError('Numéro de téléphone invalide.');
    if (codes.length === 0) return setError('Choisissez au moins une spécialité.');
    if (f.password.length < 8) return setError('Le mot de passe doit contenir au moins 8 caractères.');
    if (!terms) return setError('Acceptez les conditions d’utilisation pour continuer.');
    setBusy(true);
    try {
      await registerPractitioner({
        email: f.email.trim().toLowerCase(), phone, password: f.password, firstName: f.firstName.trim(),
        lastName: f.lastName.trim(), countryCode: country, licenseNumber: f.license.trim(), specialtyCodes: codes, locale: 'fr',
      });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      <p className="muted small">Après inscription, notre équipe vérifie votre numéro d’ordre avant de rendre votre profil visible des patients.</p>
      <div className="form-2">
        <Field label="Prénom" required><input value={f.firstName} onChange={set('firstName')} required autoComplete="given-name" /></Field>
        <Field label="Nom" required><input value={f.lastName} onChange={set('lastName')} required autoComplete="family-name" /></Field>
      </div>
      <Field label="Adresse e-mail" required><input type="email" value={f.email} onChange={set('email')} required autoComplete="email" /></Field>
      <Field label="Numéro de téléphone" required hint="Le pays de l’indicatif est celui où vous exercez.">
        <PhoneInput country={country} onCountry={setCountry} value={f.phone} onChange={(v) => setF({ ...f, phone: v })} required />
      </Field>
      <Field label="Numéro d’ordre (inscription à l’Ordre des médecins)" required><input value={f.license} onChange={set('license')} required /></Field>
      <Field label="Spécialités" required hint="Vous pouvez en ajouter plusieurs.">
        <select value="" onChange={(e) => e.target.value && toggle(e.target.value)}>
          <option value="">{codes.length ? 'Ajouter une autre spécialité' : 'Choisir une spécialité'}</option>
          {specialties.filter((s) => !codes.includes(s.code)).map((s) => <option key={s.code} value={s.code}>{s.nameFr}</option>)}
        </select>
      </Field>
      {codes.length ? (
        <div className="tags">
          {codes.map((c) => (
            <span key={c} className="tag">
              {specialties.find((s) => s.code === c)?.nameFr ?? c}
              <button type="button" aria-label={`Retirer ${specialties.find((s) => s.code === c)?.nameFr ?? c}`} onClick={() => toggle(c)}>×</button>
            </span>
          ))}
        </div>
      ) : null}
      <Field label="Mot de passe" required hint="8 caractères minimum"><input type="password" value={f.password} onChange={set('password')} required autoComplete="new-password" /></Field>
      <Terms checked={terms} onChange={setTerms} />
      <ErrorBox text={error} />
      <button className="btn" disabled={busy}>{busy ? 'Création…' : 'Créer mon compte médecin'}</button>
    </form>
  );
}
