import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  DocumentKind, ReportReason, VerificationDocument, deleteMyDocument, errorText, getMyDocuments, reportProfile, uploadMyDocument,
} from './api';
import { ErrorBox } from './components';

/** Pièces demandées : carte de l'Ordre et pièce d'identité pour un médecin ; RCCM et autorisation pour une structure. */
export const PRACTITIONER_DOCS: { kind: DocumentKind; label: string; required: boolean }[] = [
  { kind: 'ORDER_CARD', label: 'Carte ou attestation d’inscription à l’Ordre des médecins', required: true },
  { kind: 'ID_CARD', label: 'Pièce d’identité (carte d’identité ou passeport)', required: true },
  { kind: 'DIPLOMA', label: 'Diplôme de médecine (facultatif)', required: false },
];

/**
 * Pièces justificatives du médecin : une photo prise avec le téléphone suffit. Elles ne sont vues que par l'équipe
 * Ollisanté, pour vérifier le compte avant qu'il soit visible des patients.
 */
export function VerificationDocs() {
  const [docs, setDocs] = useState<VerificationDocument[] | null>(null);
  const [busy, setBusy] = useState<DocumentKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () => getMyDocuments().then(setDocs).catch((e) => setError(errorText(e)));
  useEffect(() => {
    void load();
  }, []);

  async function send(kind: DocumentKind, file: File | undefined) {
    if (!file) return;
    setBusy(kind);
    setError(null);
    try {
      await uploadMyDocument(kind, file);
      await load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="stack docs-section" aria-labelledby="docs-title">
      <h2 id="docs-title">Pièces justificatives</h2>
      <p className="muted small">Une photo nette prise avec votre téléphone suffit (ou un PDF). Elles ne sont visibles que par l’équipe Ollisanté.</p>
      <ErrorBox text={error} />
      {PRACTITIONER_DOCS.map((d) => {
        const sent = (docs ?? []).filter((x) => x.kind === d.kind);
        return (
          <div key={d.kind} className="doc-row">
            <div className="stack" style={{ gap: 2 }}>
              <strong>{d.label}</strong>
              <span className={sent.length ? 'doc-ok' : d.required ? 'doc-missing' : 'muted small'}>
                {sent.length ? `Envoyée ✓ (${sent.length})` : d.required ? 'À envoyer' : 'Facultatif'}
              </span>
            </div>
            <div className="row">
              {sent.map((x) => (
                <button key={x.id} type="button" className="btn ghost small" onClick={() => deleteMyDocument(x.id).then(load).catch((e) => setError(errorText(e)))}>
                  Retirer
                </button>
              ))}
              <label className="btn secondary small">
                {busy === d.kind ? 'Envoi…' : sent.length ? 'Ajouter' : 'Envoyer'}
                <input type="file" accept="image/*,application/pdf" hidden disabled={!!busy}
                  onChange={(e) => { void send(d.kind, e.target.files?.[0]); e.target.value = ''; }} />
              </label>
            </div>
          </div>
        );
      })}
    </section>
  );
}

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'FAKE_PROFILE', label: 'Faux profil' },
  { value: 'WRONG_INFO', label: 'Informations erronées' },
  { value: 'BEHAVIOUR', label: 'Comportement inapproprié' },
  { value: 'OTHER', label: 'Autre' },
];

/** « Signaler ce profil » : un lien discret, puis une petite fenêtre. */
export function ReportLink({ targetType, targetId }: { targetType: 'PRACTITIONER' | 'FACILITY'; targetId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('FAKE_PROFILE');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState('sending');
    setError(null);
    try {
      await reportProfile(targetType, targetId, reason, message);
      setState('done');
    } catch (err) {
      setError(errorText(err));
      setState('idle');
    }
  }

  return (
    <>
      <button type="button" className="report-link" onClick={() => setOpen(true)}>Signaler ce profil</button>
      {open ? (
        <dialog ref={dialog} className="news-dialog" onClose={() => { setOpen(false); setState('idle'); setMessage(''); }} aria-labelledby="report-title">
          {state === 'done' ? (
            <div className="stack">
              <h2 id="report-title">Merci</h2>
              <p>Votre signalement a été transmis. Notre équipe va vérifier ce profil.</p>
              <button type="button" className="btn" onClick={() => dialog.current?.close()}>Fermer</button>
            </div>
          ) : (
            <form className="stack" onSubmit={submit}>
              <h2 id="report-title">Signaler ce profil</h2>
              <label className="field">Motif
                <select value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
                  {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </label>
              <label className="field">Précisions (facultatif)
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} rows={3} />
              </label>
              <ErrorBox text={error} />
              <div className="row">
                <button className="btn" disabled={state === 'sending'}>{state === 'sending' ? 'Envoi…' : 'Envoyer'}</button>
                <button type="button" className="btn ghost" onClick={() => dialog.current?.close()}>Annuler</button>
              </div>
            </form>
          )}
        </dialog>
      ) : null}
    </>
  );
}
