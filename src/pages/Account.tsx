import { FormEvent, useEffect, useState } from 'react';
import {
  Appointment, Profile, Sex, cancelAppointment, cancellationPreview, changePassword, deleteMyAccount, errorText,
  getProfile, logout, myAppointments, updateProfile, getBilling, getReceipt, emailReceipt, PatientBilling, BillingItem,
  Relation, Relative, addRelative, deleteRelative, getRelatives, updateRelative,
} from '../api';
import { setLockedCountry } from '../brand';
import { AuthPanel } from '../Auth';
import { ErrorBox, Field, useCountries } from '../components';
import { dayLong, flag, money, time } from '../format';
import { useLoad, useSession } from '../hooks';
import { PaymentPanel } from '../Payment';
import { VerificationDocs } from '../Trust';
import { href } from '../router';

type Tab = 'upcoming' | 'past' | 'cancelled';

/**
 * Espace patient, sur le modèle des comptes Doctolib et Qare : un menu (rendez-vous, informations personnelles,
 * connexion et sécurité, aide) et la rubrique choisie à côté.
 */
export default function Account({ section, item }: { section?: string; item?: string }) {
  const user = useSession();
  if (!user) {
    return (
      <div className="page"><div className="wrap narrow stack">
        <h1>Mon espace patient</h1>
        <AuthPanel intro="Connectez-vous pour retrouver vos rendez-vous. Le compte est le même que dans l’application Ollisanté." />
        <p className="small muted">Vous êtes médecin ? Votre espace se trouve dans l’application Ollisanté. Vous êtes une structure ? <a href="/structure/">Espace Structure</a>.</p>
      </div></div>
    );
  }
  if (user.user.role === 'PRACTITIONER') return <AccountLayout pro section={section ?? ''} contact={user.user.email ?? user.user.phone ?? ''} />;
  if (user.user.role !== 'PATIENT') {
    return (
      <div className="page"><div className="wrap narrow stack">
        <h1>Mon espace</h1>
        <p className="muted">Les structures de santé gèrent leurs médecins et leurs agendas depuis l’Espace Structure.</p>
        <div className="row">
          <a className="btn" href="/structure/">Ouvrir l’Espace Structure</a>
          <button className="btn secondary" onClick={() => void logout()}>Se déconnecter</button>
        </div>
      </div></div>
    );
  }
  if (section === 'recu' && item) return <ReceiptPage paymentId={item} />;
  return <AccountLayout section={section ?? ''} contact={user.user.email ?? user.user.phone ?? ''} />;
}

/** Rubriques du compte, dans l'ordre demandé (Doctolib / Qare) ; « securite » reste accepté pour les anciens liens. */
const MENU = [
  { id: '', label: 'Mes rendez-vous' },
  { id: 'informations', label: 'Mes informations' },
  { id: 'connexion', label: 'Connexion' },
  { id: 'paiements', label: 'Paiement et facturation' },
  { id: 'parametres', label: 'Paramètres' },
  { id: 'confidentialite', label: 'Confidentialité' },
] as const;

function AccountLayout({ section, contact, pro = false }: { section: string; contact: string; pro?: boolean }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    getProfile().then(setProfile).catch(() => undefined);
  }, []);
  const name = pro
    ? (profile?.practitioner ? `Dr ${profile.practitioner.firstName} ${profile.practitioner.lastName}` : '')
    : [profile?.patient?.firstName, profile?.patient?.lastName].filter(Boolean).join(' ');
  const initials = name.replace(/^Dr /, '').split(' ').map((w) => w[0]?.toUpperCase()).slice(0, 2).join('') || '?';
  const wanted = section === 'securite' ? 'connexion' : section;
  const current = MENU.some((m) => m.id === wanted) ? wanted : '';
  const pending = pro && profile?.practitioner && profile.practitioner.verificationStatus !== 'VERIFIED';
  return (
    <div className="page">
      <div className="wrap account">
        <aside className="account-menu">
          <div className="account-who">
            <span className="avatar">{initials}</span>
            <span className="stack" style={{ gap: 2, minWidth: 0 }}>
              <strong>{name || 'Mon compte'}</strong>
              <span className="muted small account-contact">{contact}</span>
            </span>
          </div>
          <nav aria-label="Mon compte">
            {MENU.map((m) => (
              <a key={m.id} href={href(m.id ? `compte/${m.id}` : 'compte')} aria-current={current === m.id ? 'page' : undefined}>{m.label}</a>
            ))}
            <button type="button" className="logout" onClick={() => void logout()}>Déconnexion</button>
          </nav>
        </aside>
        <section className="account-body">
          {pending ? (
            <div className="notice" style={{ marginBottom: 16 }}>
              Votre profil est en cours de vérification : il sera visible des patients dès sa validation.{' '}
              <a href={href('compte/informations')}>Envoyez vos pièces justificatives</a> pour accélérer la vérification.
            </div>
          ) : null}
          {current === 'informations' ? (
            <div className="stack" style={{ gap: 32 }}>
              {pro ? <ProProfileInfo profile={profile} /> : <PersonalInfo profile={profile} onSaved={setProfile} />}
              {pro ? <VerificationDocs /> : null}
              <Relatives />
            </div>
          ) : current === 'connexion' ? <ConnexionSettings profile={profile} onSaved={setProfile} />
            : current === 'paiements' ? (pro ? <ProBillingView /> : <Billing />)
              : current === 'parametres' ? <Settings profile={profile} onSaved={setProfile} pro={pro} />
                : current === 'confidentialite' ? <Privacy profile={profile} onSaved={setProfile} />
                  : pro ? <ProAppointments /> : <Appointments />}
        </section>
      </div>
    </div>
  );
}

const RELATIONS: Record<Relation, string> = { CHILD: 'Enfant', PARENT: 'Parent', SPOUSE: 'Conjoint(e)', OTHER: 'Autre proche' };

/** Mes proches : ajoutez et gérez les profils de vos proches, pour prendre rendez-vous à leur place. */
function Relatives() {
  const list = useLoad(getRelatives, []);
  const [editing, setEditing] = useState<Relative | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function remove(r: Relative) {
    if (!window.confirm(`Retirer ${r.firstName} ${r.lastName} de vos proches ?`)) return;
    try {
      await deleteRelative(r.id);
      await list.reload();
    } catch (e) {
      setError(errorText(e));
    }
  }
  return (
    <div className="stack">
      <div className="row">
        <h2 style={{ fontSize: 22 }}>Mes proches</h2>
        <div className="spacer" />
        {editing ? null : <button type="button" className="btn small secondary" onClick={() => setEditing('new')}>Ajouter un proche</button>}
      </div>
      <p className="muted small">Ajoutez et gérez les profils de vos proches (enfants, parents…) pour prendre rendez-vous pour eux.</p>
      <ErrorBox text={list.error ?? error} />
      {editing ? <RelativeForm relative={editing === 'new' ? null : editing} onDone={async () => { setEditing(null); await list.reload(); }} onCancel={() => setEditing(null)} /> : null}
      {list.data && list.data.length === 0 && !editing ? <div className="empty-state card">Aucun proche pour le moment.</div> : null}
      {(list.data ?? []).map((r) => (
        <article key={r.id} className="card bill-row">
          <div className="stack" style={{ gap: 2 }}>
            <strong>{r.firstName} {r.lastName}</strong>
            <span className="muted small">{RELATIONS[r.relation]}{r.birthDate ? ` · né(e) le ${toDisplay(r.birthDate)}` : ''}</span>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button type="button" className="btn small secondary" onClick={() => setEditing(r)}>Modifier</button>
            <button type="button" className="btn small danger" onClick={() => void remove(r)}>Retirer</button>
          </div>
        </article>
      ))}
    </div>
  );
}

function RelativeForm({ relative, onDone, onCancel }: { relative: Relative | null; onDone: () => Promise<void>; onCancel: () => void }) {
  const [f, setF] = useState({
    firstName: relative?.firstName ?? '', lastName: relative?.lastName ?? '', birth: toDisplay(relative?.birthDate),
    sex: (relative?.sex ?? '') as Sex | '', relation: (relative?.relation ?? 'CHILD') as Relation,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  async function submit(e: FormEvent) {
    e.preventDefault();
    const birthDate = toIso(f.birth);
    if (birthDate === undefined) return setError('Date de naissance : format JJ/MM/AAAA.');
    setBusy(true);
    setError(null);
    try {
      const body = { firstName: f.firstName, lastName: f.lastName, birthDate, sex: f.sex || null, relation: f.relation };
      if (relative) await updateRelative(relative.id, body);
      else await addRelative(body);
      await onDone();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="card stack" onSubmit={submit}>
      <div className="form-2">
        <Field label="Prénom" required><input value={f.firstName} onChange={set('firstName')} required /></Field>
        <Field label="Nom" required><input value={f.lastName} onChange={set('lastName')} required /></Field>
        <Field label="Lien" required>
          <select value={f.relation} onChange={set('relation')}>
            {(Object.keys(RELATIONS) as Relation[]).map((r) => <option key={r} value={r}>{RELATIONS[r]}</option>)}
          </select>
        </Field>
        <Field label="Date de naissance"><input value={f.birth} onChange={set('birth')} placeholder="JJ/MM/AAAA" inputMode="numeric" /></Field>
        <Field label="Sexe">
          <select value={f.sex} onChange={set('sex')}>
            <option value="">Choisir</option><option value="FEMALE">Femme</option><option value="MALE">Homme</option><option value="OTHER">Autre</option>
          </select>
        </Field>
      </div>
      <ErrorBox text={error} />
      <div className="row">
        <button className="btn" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
        <button type="button" className="btn ghost" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  );
}

/** Médecin → Mon profil : informations vérifiées par l'équipe (modifiables dans l'application ou sur demande). */
function ProProfileInfo({ profile }: { profile: Profile | null }) {
  const pr = profile?.practitioner;
  if (!pr) return <div className="spinner" />;
  return (
    <div className="stack">
      <h1>Mon profil</h1>
      <div className="card">
        <dl className="receipt-grid">
          <dt>Nom</dt><dd>Dr {pr.firstName} {pr.lastName}</dd>
          <dt>Statut</dt><dd>{pr.verificationStatus === 'VERIFIED' ? 'Vérifié : visible des patients' : 'En cours de vérification'}</dd>
        </dl>
      </div>
      <p className="muted small">Votre présentation, vos horaires et la téléconsultation se modifient dans l’application Ollisanté (Compte → Mon profil professionnel).</p>
    </div>
  );
}

/** Connexion : téléphone, e-mail, mot de passe et double authentification. */
function ConnexionSettings({ profile, onSaved }: { profile: Profile | null; onSaved: (p: Profile) => void }) {
  const [error, setError] = useState<string | null>(null);
  if (!profile) return <div className="spinner" />;
  async function toggleTwoStep() {
    setError(null);
    try {
      onSaved(await updateProfile({ twoStepEnabled: !profile!.twoStepEnabled }));
    } catch (e) {
      setError(errorText(e));
    }
  }
  return (
    <div className="stack" style={{ gap: 24 }}>
      <h1>Connexion</h1>
      <div className="card stack" style={{ gap: 10 }}>
        <div><strong>Téléphone</strong><div className="muted">{profile.phone ?? 'Non renseigné'}</div></div>
        <div><strong>E-mail</strong><div className="muted">{profile.email ?? 'Non renseigné'}</div></div>
        <p className="small muted">Pour changer d’adresse e-mail ou de numéro, écrivez-nous depuis le <a href={href('aide')}>Centre d’aide</a>.</p>
      </div>
      <PasswordCard profile={profile} />
      <div className="card setting-row">
        <div className="stack" style={{ gap: 4 }}>
          <strong>Double authentification</strong>
          <span className="muted small">Protection supplémentaire lorsque vous vous connectez à votre compte : un code vous est envoyé par e-mail sur un nouvel appareil.</span>
        </div>
        <button type="button" className={`switch${profile.twoStepEnabled ? ' on' : ''}`} role="switch" aria-checked={profile.twoStepEnabled} onClick={() => void toggleTwoStep()}>
          <span>{profile.twoStepEnabled ? 'Activée' : 'Désactivée'}</span>
        </button>
      </div>
      <ErrorBox text={error} />
    </div>
  );
}

/** Paramètres : pays (filtre tout le site) et langue. */
function Settings({ profile, onSaved, pro }: { profile: Profile | null; onSaved: (p: Profile) => void; pro: boolean }) {
  const countries = useCountries();
  const [error, setError] = useState<string | null>(null);
  if (!profile) return <div className="spinner" />;
  const current = countries.find((c) => c.code === profile.countryCode);
  async function changeCountry(code: string) {
    if (!code || !window.confirm('Changer de pays ? Vous verrez alors les professionnels, disponibilités et tarifs de ce pays.')) return;
    try {
      onSaved(await updateProfile({ countryCode: code }));
      setLockedCountry(code);
    } catch (e) {
      setError(errorText(e));
    }
  }
  return (
    <div className="stack" style={{ gap: 24 }}>
      <h1>Paramètres</h1>
      <div className="card stack" style={{ gap: 8 }}>
        <strong>Pays</strong>
        {pro ? (
          <p className="muted">{current ? `${flag(current.code)} ${current.nameFr}` : profile.countryCode} — pays d’exercice, modifiable sur demande auprès de l’équipe.</p>
        ) : (
          <select value={profile.countryCode ?? ''} onChange={(e) => void changeCountry(e.target.value)}>
            <option value="">Choisir mon pays</option>
            {countries.map((c) => <option key={c.code} value={c.code}>{flag(c.code)} {c.nameFr}</option>)}
          </select>
        )}
        <span className="muted small">Vous ne voyez que les professionnels, disponibilités et tarifs de votre pays.</span>
      </div>
      <div className="card stack" style={{ gap: 8 }}>
        <strong>Langue</strong>
        <p className="muted">Français. L’anglais est disponible dans l’application Ollisanté.</p>
      </div>
      <ErrorBox text={error} />
    </div>
  );
}

/** Confidentialité : préférences de rappel, informations légales, suppression du compte. */
function Privacy({ profile, onSaved }: { profile: Profile | null; onSaved: (p: Profile) => void }) {
  const [error, setError] = useState<string | null>(null);
  if (!profile) return <div className="spinner" />;
  async function toggle(k: 'notifyEmail' | 'notifySms') {
    setError(null);
    try {
      onSaved(await updateProfile({ [k]: !profile![k] }));
    } catch (e) {
      setError(errorText(e));
    }
  }
  async function remove() {
    if (!window.confirm('Supprimer votre compte ?\nVos informations personnelles seront effacées et vos rendez-vous à venir annulés. Cette action est définitive.')) return;
    try {
      await deleteMyAccount();
      await logout();
      window.alert('Votre compte a bien été supprimé.');
    } catch (err) {
      setError(errorText(err));
    }
  }
  return (
    <div className="stack" style={{ gap: 24 }}>
      <h1>Confidentialité</h1>
      <div className="card stack" style={{ gap: 12 }}>
        <h2 style={{ fontSize: 20 }}>Mes préférences</h2>
        {([['notifyEmail', 'Rappels de rendez-vous par e-mail'], ['notifySms', 'Rappels de rendez-vous par SMS']] as const).map(([k, label]) => (
          <div key={k} className="setting-row">
            <span>{label}</span>
            <button type="button" className={`switch${profile[k] ? ' on' : ''}`} role="switch" aria-checked={profile[k]} onClick={() => void toggle(k)}>
              <span>{profile[k] ? 'Activés' : 'Désactivés'}</span>
            </button>
          </div>
        ))}
      </div>
      <div className="card stack" style={{ gap: 6 }}>
        <h2 style={{ fontSize: 20 }}>Informations légales</h2>
        <a href="/legal/cgu.html">Conditions d’utilisation</a>
        <a href="/legal/confidentialite.html">Politique de confidentialité</a>
        <a href="/legal/mentions-legales.html">Mentions légales</a>
      </div>
      <div className="card stack" style={{ gap: 8 }}>
        <h2 style={{ fontSize: 20 }}>Supprimer mon compte</h2>
        <p className="muted small">Annulez d’abord vos rendez-vous déjà payés pour être remboursé.</p>
        <div className="row"><button type="button" className="btn danger small" onClick={() => void remove()}>Supprimer mon compte</button></div>
      </div>
      <ErrorBox text={error} />
    </div>
  );
}

/** « 1990-05-21 » ↔ « 21/05/1990 ». */
const toDisplay = (iso: string | null | undefined) => (iso ? iso.split('-').reverse().join('/') : '');
function toIso(display: string): string | null | undefined {
  const t = display.trim();
  if (!t) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : undefined;
}

function PersonalInfo({ profile, onSaved }: { profile: Profile | null; onSaved: (p: Profile) => void }) {
  const countries = useCountries();
  const p = profile?.patient;
  const [f, setF] = useState({ firstName: '', lastName: '', birth: '', sex: '' as Sex | '', countryCode: '', city: '', address: '' });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (p) setF({ firstName: p.firstName ?? '', lastName: p.lastName ?? '', birth: toDisplay(p.birthDate), sex: p.sex ?? '',
      countryCode: p.countryCode ?? '', city: p.city ?? '', address: p.address ?? '' });
  }, [p]);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setSaved(false); setF({ ...f, [k]: e.target.value }); };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const birthDate = toIso(f.birth);
    if (birthDate === undefined) return setError('Date de naissance : format JJ/MM/AAAA.');
    setError(null);
    setBusy(true);
    try {
      onSaved(await updateProfile({
        firstName: f.firstName, lastName: f.lastName, ...(birthDate ? { birthDate } : {}), ...(f.sex ? { sex: f.sex } : {}),
        countryCode: f.countryCode, city: f.city, address: f.address,
      }));
      setSaved(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  if (!profile) return <div className="spinner" />;
  return (
    <form className="stack" onSubmit={submit}>
      <h1>Mes informations</h1>
      <p className="muted small">Ces informations sont transmises au professionnel lors de vos rendez-vous.</p>
      <div className="form-2">
        <Field label="Prénom" required><input value={f.firstName} onChange={set('firstName')} required autoComplete="given-name" /></Field>
        <Field label="Nom" required><input value={f.lastName} onChange={set('lastName')} required autoComplete="family-name" /></Field>
        <Field label="Date de naissance"><input value={f.birth} onChange={set('birth')} placeholder="JJ/MM/AAAA" inputMode="numeric" /></Field>
        <Field label="Sexe">
          <select value={f.sex} onChange={set('sex')}>
            <option value="">Choisir</option><option value="FEMALE">Femme</option><option value="MALE">Homme</option><option value="OTHER">Autre</option>
          </select>
        </Field>
        <Field label="Pays">
          <select value={f.countryCode} onChange={set('countryCode')}>
            <option value="">Choisir</option>
            {countries.map((c) => <option key={c.code} value={c.code}>{c.nameFr}</option>)}
          </select>
        </Field>
        <Field label="Ville"><input value={f.city} onChange={set('city')} autoComplete="address-level2" /></Field>
      </div>
      <Field label="Adresse"><input value={f.address} onChange={set('address')} autoComplete="street-address" /></Field>
      <ErrorBox text={error} />
      {saved ? <div className="notice">Vos informations sont enregistrées.</div> : null}
      <div className="row"><button className="btn" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button></div>
    </form>
  );
}

const OPERATORS: Record<string, string> = {
  ORANGE_SEN: 'Orange Money', FREE_SEN: 'Free Money', ORANGE_CIV: 'Orange Money', MTN_MOMO_CIV: 'MTN MoMo',
  MOOV_BEN: 'Moov Money', MTN_MOMO_BEN: 'MTN MoMo', AIRTEL_COD: 'Airtel Money', ORANGE_COD: 'Orange Money',
  VODACOM_MPESA_COD: 'M-Pesa', MTN_MOMO_CMR: 'MTN MoMo', ORANGE_CMR: 'Orange Money',
};
const operatorName = (code: string | null) => (code ? OPERATORS[code] ?? code.replace(/_/g, ' ') : 'Mobile Money');
const STATUS: Record<BillingItem['status'], [string, string]> = {
  PAID: ['Payé', 'ok'], PARTIALLY_REFUNDED: ['Remboursé en partie', 'wait'], REFUNDED: ['Remboursé', 'muted'],
  PENDING: ['Paiement en cours', 'wait'], ON_SITE: ['À régler sur place', 'muted'],
};

/** Paiements et reçus : moyens de paiement du pays, historique et reçus (sans commission : le patient voit ce qu'il paie). */
function Billing() {
  const billing = useLoad(getBilling, []);
  const countries = useCountries();
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const b: PatientBilling | null | undefined = billing.data?.patient;
  const country = b?.countryCode ? countries.find((c) => c.code === b.countryCode) : undefined;

  async function send(paymentId: string) {
    setError(null);
    try {
      await emailReceipt(paymentId);
      setSent(paymentId);
    } catch (e) {
      setError(errorText(e));
    }
  }

  if (billing.loading && !billing.data) return <div className="spinner" />;
  return (
    <div className="stack" style={{ gap: 24 }}>
      <h1>Paiement et facturation</h1>
      <p className="muted small" style={{ marginTop: -16 }}>Gérez vos paiements en ligne avec les soignants.</p>
      <ErrorBox text={billing.error ?? error} />
      <div className="card stack" style={{ gap: 8 }}>
        <h2 style={{ fontSize: 20 }}>Moyens de paiement</h2>
        {b?.countryCode ? (
          <>
            <p className="muted small">Acceptés {country ? `en ${country.nameFr}` : 'dans votre pays'} lors de la réservation :</p>
            <div className="pay-badges">
              {b.methods.includes('MOBILE_MONEY') ? <span className="badge">Mobile Money</span> : null}
              {b.methods.includes('ON_SITE') ? <span className="badge muted-badge">Sur place</span> : null}
              {b.methods.length === 0 ? <span className="muted small">La réservation en ligne n’est pas encore ouverte dans ce pays.</span> : null}
            </div>
          </>
        ) : (
          <p className="muted small">Indiquez votre pays dans <a href={href('compte/informations')}>Mes informations</a> pour voir les moyens de paiement acceptés.</p>
        )}
        {b?.lastMobileMoney ? (
          <p className="small">Dernier compte Mobile Money utilisé : <strong>{operatorName(b.lastMobileMoney.operator)}</strong>{b.lastMobileMoney.phone ? ` (${b.lastMobileMoney.phone})` : ''}</p>
        ) : null}
        <p className="muted small">Ollisanté n’enregistre aucun code secret : chaque paiement Mobile Money se valide sur votre téléphone.</p>
      </div>
      <div className="card stack" style={{ gap: 6 }}>
        <div className="row"><h2 style={{ fontSize: 20 }}>Vos cartes bancaires</h2><span className="badge muted-badge">Bientôt disponible</span></div>
        <p className="muted small">Pour les paiements de vos consultations. Le paiement par carte bancaire arrive prochainement ; aucune carte n’est enregistrée par Ollisanté.</p>
      </div>
      <div className="stack">
        <h2 style={{ fontSize: 20 }}>Historique</h2>
        {b && b.items.length === 0 ? <div className="empty-state card">Aucun paiement pour le moment.</div> : null}
        {(b?.items ?? []).map((i) => {
          const [label, tone] = STATUS[i.status] ?? [i.status, 'muted'];
          return (
            <article key={(i.paymentId ?? '') + i.appointmentId} className="card bill-row">
              <div className="stack" style={{ gap: 4 }}>
                <strong>{i.practitioner}</strong>
                <span className="muted small">Rendez-vous du {dayLong(i.appointmentAt)}{i.facility ? ` · ${i.facility}` : ''}</span>
                <span className="small">{i.method === 'MOBILE_MONEY' ? operatorName(i.operator) : 'Sur place'}{i.receiptNumber ? ` · Reçu ${i.receiptNumber}` : ''}</span>
              </div>
              <div className="bill-side">
                <strong className="bill-amount">{money(i.amountMinor, i.currency)}</strong>
                <span className={`badge${tone === 'ok' ? '' : tone === 'wait' ? ' wait-badge' : ' muted-badge'}`}>{label}</span>
                {i.refundedMinor > 0 ? <span className="small muted">Remboursé : {money(i.refundedMinor, i.currency)}</span> : null}
                {i.receiptNumber && i.paymentId ? (
                  <span className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                    <a className="btn small secondary" href={href(`compte/recu/${i.paymentId}`)}>Voir le reçu</a>
                    <button type="button" className="btn small ghost" onClick={() => void send(i.paymentId!)} disabled={sent === i.paymentId}>
                      {sent === i.paymentId ? 'Envoyé ✓' : 'Par e-mail'}
                    </button>
                  </span>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

/** Reçu de paiement imprimable (ou enregistrable en PDF depuis la fenêtre d'impression). */
function ReceiptPage({ paymentId }: { paymentId: string }) {
  const r = useLoad(() => getReceipt(paymentId), [paymentId]);
  const d = r.data;
  return (
    <div className="page">
      <div className="wrap narrow stack">
        <div className="row no-print">
          <a className="btn ghost small" href={href('compte/paiements')}>← Paiements et reçus</a>
          <div className="spacer" />
          {d ? <button type="button" className="btn small" onClick={() => window.print()}>Imprimer ou enregistrer en PDF</button> : null}
        </div>
        <ErrorBox text={r.error} />
        {d ? (
          <article className="receipt card">
            <header className="row" style={{ justifyContent: 'space-between' }}>
              <span className="brand"><span>Ollisanté</span></span>
              <span className="muted small">Reçu n° {d.number}</span>
            </header>
            <h1 style={{ fontSize: 24 }}>Reçu de paiement</h1>
            <dl className="receipt-grid">
              <dt>Émis par</dt><dd>{d.issuer}, éditeur de la plateforme Ollisanté</dd>
              <dt>Patient</dt><dd>{d.payer}</dd>
              <dt>Consultation</dt><dd>{d.practitioner}{d.facility ? ` — ${d.facility}` : ''}</dd>
              <dt>Rendez-vous</dt><dd>{dayLong(d.appointmentAt)}, {time(d.appointmentAt)}</dd>
              <dt>Moyen de paiement</dt><dd>{operatorName(d.operator)}{d.phone ? ` (${d.phone})` : ''}</dd>
              <dt>Date du paiement</dt><dd>{dayLong(d.issuedAt)}, {time(d.issuedAt)}</dd>
              <dt>Montant payé</dt><dd><strong>{money(d.amountMinor, d.currency)}</strong></dd>
              {d.refundedMinor > 0 ? <><dt>Remboursé</dt><dd>{money(d.refundedMinor, d.currency)}</dd></> : null}
            </dl>
            <p className="muted small">Ce reçu atteste le paiement en ligne de la consultation sur Ollisanté.</p>
          </article>
        ) : r.loading ? <div className="spinner" /> : null}
      </div>
    </div>
  );
}

function ProAppointments() {
  const list = useLoad(myAppointments, []);
  const now = Date.now();
  const upcoming = (list.data ?? [])
    .filter((a) => (a.status === 'CONFIRMED' || a.status === 'PENDING_PAYMENT') && new Date(a.startsAt).getTime() > now - 3600_000)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return (
    <div className="stack">
      <h1>Mes rendez-vous</h1>
      <p className="muted small">Pour ouvrir vos horaires ou modifier votre profil, utilisez l’application Ollisanté.</p>
      <ErrorBox text={list.error} />
      {list.loading && !list.data ? <div className="spinner" /> : null}
      {list.data && upcoming.length === 0 ? <div className="empty-state card">Aucun rendez-vous à venir.</div> : null}
      {upcoming.map((a) => (
        <article key={a.id} className={`card appt${a.status === 'PENDING_PAYMENT' ? ' pending' : ''}`}>
          <div className="stack" style={{ gap: 4 }}>
            <strong>{dayLong(a.startsAt)}, {time(a.startsAt)}</strong>
            <span>{a.patientName}</span>
            <span className="muted small">{[a.facilityName, a.reason].filter(Boolean).join(' · ') || (a.mode === 'VIDEO' ? 'Téléconsultation' : '')}</span>
            {a.priceMinor != null && a.priceCurrency ? (
              <span className="small">{a.paymentMode === 'ONLINE' ? (a.status === 'PENDING_PAYMENT' ? 'Paiement en cours' : 'Payé en ligne') : 'À encaisser sur place'} : {money(a.priceMinor, a.priceCurrency)}</span>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function ProBillingView() {
  const billing = useLoad(getBilling, []);
  const p = billing.data?.pro;
  if (billing.loading && !billing.data) return <div className="spinner" />;
  return (
    <div className="stack" style={{ gap: 20 }}>
      <h1>Paiements et reversements</h1>
      <ErrorBox text={billing.error} />
      {p ? (
        <>
          <div className="notice small">Commission Ollisanté : {p.commissionPercent} % des consultations payées en ligne, déduite avant chaque reversement (chaque vendredi). Les consultations réglées sur place ne sont pas concernées.</div>
          <div className="card stack" style={{ gap: 8 }}>
            <h2 style={{ fontSize: 20 }}>Ce mois-ci</h2>
            {p.monthTotals.length === 0 ? <p className="muted small">Aucune consultation payée en ligne pour le moment.</p> : null}
            {p.monthTotals.map((m) => (
              <dl key={m.currency} className="receipt-grid">
                <dt>Encaissé en ligne ({m.onlineCount})</dt><dd>{money(m.grossMinor, m.currency)}</dd>
                <dt>Commission ({p.commissionPercent} %)</dt><dd>− {money(m.commissionMinor, m.currency)}</dd>
                <dt><strong>Net pour vous</strong></dt><dd><strong>{money(m.netMinor, m.currency)}</strong></dd>
              </dl>
            ))}
            <p className="muted small">Consultations réglées sur place ce mois-ci : {p.onSiteThisMonth} (encaissées directement par vous).</p>
          </div>
          <div className="stack">
            <h2 style={{ fontSize: 20 }}>Reversements</h2>
            {p.payouts.length === 0 ? <p className="muted small">Aucun reversement pour le moment.</p> : null}
            {p.payouts.map((o) => (
              <article key={o.id} className="card bill-row">
                <div className="stack" style={{ gap: 4 }}>
                  <strong>Relevé du {dayLong(o.periodEnd)}</strong>
                  <span className="muted small">Encaissé {money(o.grossMinor, o.currency)} · commission {money(o.commissionMinor, o.currency)}</span>
                </div>
                <div className="bill-side">
                  <strong className="bill-amount">{money(o.amountMinor, o.currency)}</strong>
                  <span className={`badge${o.status === 'PAID' ? '' : ' wait-badge'}`}>{o.status === 'PAID' ? 'Versé' : 'À verser'}</span>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

/** Connexion → Mot de passe (l'ancien est demandé ; ensuite tous les appareils se reconnectent). */
function PasswordCard({ profile }: { profile: Profile }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (next.length < 8) return setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
    if (next !== confirm) return setError('Les deux mots de passe ne sont pas identiques.');
    setError(null);
    setBusy(true);
    try {
      await changePassword(current, next);
      window.alert('Mot de passe modifié. Reconnectez-vous avec votre nouveau mot de passe.');
      await logout();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  if (!profile.hasPassword) {
    return <div className="card"><strong>Mot de passe</strong><p className="muted small">Connexion par SMS : un code vous est envoyé à chaque connexion, pas de mot de passe à gérer.</p></div>;
  }
  return (
    <form className="card stack" onSubmit={submit}>
      <h2 style={{ fontSize: 20 }}>Mot de passe</h2>
      <Field label="Mot de passe actuel" required><input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" /></Field>
      <Field label="Nouveau mot de passe" required hint="8 caractères minimum"><input type="password" value={next} onChange={(e) => setNext(e.target.value)} required autoComplete="new-password" /></Field>
      <Field label="Confirmer le nouveau mot de passe" required><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" /></Field>
      <ErrorBox text={error} />
      <p className="small muted">Par sécurité, vous serez déconnecté de tous vos appareils.</p>
      <div className="row"><button className="btn" disabled={busy}>{busy ? 'Enregistrement…' : 'Changer le mot de passe'}</button></div>
    </form>
  );
}

function Appointments() {
  const [tab, setTab] = useState<Tab>('upcoming');
  const [paying, setPaying] = useState<Appointment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const list = useLoad(myAppointments, []);
  const now = Date.now();
  const active = (a: Appointment) => a.status === 'CONFIRMED' || a.status === 'PENDING_PAYMENT';
  const all = list.data ?? [];
  const groups: Record<Tab, Appointment[]> = {
    upcoming: all.filter((a) => active(a) && new Date(a.startsAt).getTime() > now).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    past: all.filter((a) => !active(a) ? a.status === 'COMPLETED' : new Date(a.startsAt).getTime() <= now),
    cancelled: all.filter((a) => a.status === 'CANCELLED' || a.status === 'NO_SHOW'),
  };

  async function cancel(a: Appointment) {
    setError(null);
    let text = 'Le créneau sera libéré pour un autre patient.';
    try {
      const p = await cancellationPreview(a.id);
      if (p.paid && p.currency) {
        text = p.refundMinor > 0
          ? `Vous serez remboursé de ${money(p.refundMinor, p.currency)} (${p.refundPercent} %) sur votre compte Mobile Money.`
          : 'À moins de 6 heures du rendez-vous, la consultation n’est pas remboursée.';
      }
    } catch {
      // aperçu indisponible : message général
    }
    if (!window.confirm(`Annuler ce rendez-vous ?\n${text}`)) return;
    try {
      await cancelAppointment(a.id);
      await list.reload();
    } catch (e) {
      setError(errorText(e));
    }
  }

  if (paying) {
    return (
      <div className="stack">
        <button className="btn ghost small" style={{ justifySelf: 'start' }} onClick={() => setPaying(null)}>← Mes rendez-vous</button>
        <h1>Paiement</h1>
        <PaymentPanel appointment={paying} onPaid={() => { setPaying(null); void list.reload(); }} />
      </div>
    );
  }

  return (
    <div>
      <div className="stack">
        <div className="row">
          <h1>Mes rendez-vous</h1>
          <div className="spacer" />
          <a className="btn small" href={href('recherche')}>Prendre rendez-vous</a>
        </div>
        <div className="tabs">
          {([['upcoming', 'À venir'], ['past', 'Passés'], ['cancelled', 'Annulés']] as const).map(([k, label]) => (
            <button key={k} className={`tab${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>{label} ({groups[k].length})</button>
          ))}
        </div>
        <ErrorBox text={list.error ?? error} />
        {list.loading && !list.data ? <div className="spinner" /> : null}
        {list.data && groups[tab].length === 0 ? <div className="empty-state card">Aucun rendez-vous ici.</div> : null}
        {groups[tab].map((a) => (
          <article key={a.id} className={`card appt${a.status === 'PENDING_PAYMENT' ? ' pending' : tab !== 'upcoming' ? ' past' : ''}`}>
            <div className="stack" style={{ gap: 6 }}>
              <strong>{dayLong(a.startsAt)}, {time(a.startsAt)}</strong>
              <span>Dr {a.practitionerName}</span>
              {a.facilityName ? <span className="muted">{a.facilityName}</span> : null}
              {a.priceMinor != null && a.priceCurrency && a.status !== 'CANCELLED' ? (
                <span className="small">{a.paymentMode === 'ONLINE' && a.status !== 'PENDING_PAYMENT' ? 'Payé' : 'À régler sur place'} : {money(a.priceMinor, a.priceCurrency)}</span>
              ) : null}
              {a.status === 'PENDING_PAYMENT' ? <span className="status-pending">Paiement en attente : le créneau est réservé 30 minutes.</span> : null}
              {tab === 'upcoming' ? (
                <div className="row" style={{ marginTop: 6 }}>
                  {a.status === 'PENDING_PAYMENT' ? <button className="btn small" onClick={() => setPaying(a)}>Payer maintenant</button> : null}
                  <button className="btn danger small" onClick={() => void cancel(a)}>Annuler</button>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
