import { campaignSignup } from './campaign';
/** Appels à l'API Ollisanté (même adresse que le site : /api/...). */

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

// ---------- session du patient (gardée sur cet ordinateur jusqu'à la déconnexion) ----------

export interface User { id: string; email: string | null; phone: string | null; role: string }
interface Session { accessToken: string; refreshToken: string; user: User }
interface AuthData { accessToken: string; refreshToken: string; user: User }

const KEY = 'ollisante-site-session';
const listeners = new Set<() => void>();

export const session = {
  load(): Session | null {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  },
  save(s: Session | null) {
    try {
      if (s) localStorage.setItem(KEY, JSON.stringify(s));
      else localStorage.removeItem(KEY);
    } catch {
      // stockage indisponible (navigation privée) : la session dure le temps de la page
    }
    listeners.forEach((l) => l());
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Page d'erreur HTML (serveur en cours de redémarrage, passerelle) : message clair plutôt qu'un plantage.
    throw new ApiError(res.status, 'SERVEUR', 'Le service est momentanément indisponible. Réessayez dans un instant.');
  }
  if (res.ok) return data as T;
  const field = data?.fieldErrors ? Object.values(data.fieldErrors as Record<string, string>)[0] : null;
  throw new ApiError(res.status, data?.code ?? 'ERREUR', field ?? data?.message ?? `Erreur ${res.status}`);
}

let refreshing: Promise<'ok' | 'invalid' | 'error'> | null = null;

/** Renouvelle la session. « invalid » seulement si le serveur refuse le jeton : une coupure réseau ou un
 * redémarrage du serveur ne doit pas déconnecter la personne. */
function refresh(): Promise<'ok' | 'invalid' | 'error'> {
  refreshing ??= (async () => {
    const s = session.load();
    if (!s) return 'invalid' as const;
    try {
      const res = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: s.refreshToken }),
      });
      if (res.status === 400 || res.status === 401 || res.status === 403) return 'invalid' as const;
      if (!res.ok) return 'error' as const;
      const data = (await res.json()) as AuthData;
      session.save({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
      return 'ok' as const;
    } catch {
      return 'error' as const;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const NETWORK_ERROR = 'Impossible de joindre le serveur. Vérifiez votre connexion.';

export async function api<T>(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const send = () => {
    const s = init.auth === false ? null : session.load();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (init.body !== undefined) headers['Content-Type'] = 'application/json';
    if (s) headers.Authorization = `Bearer ${s.accessToken}`;
    return fetch(path, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  };
  // Lectures : une seconde tentative si le réseau mobile coupe ou si le serveur redémarre (502/503/504).
  const reads = (init.method ?? 'GET') === 'GET';
  let res: Response | null = null;
  for (let attempt = 0; attempt < (reads ? 2 : 1); attempt++) {
    if (attempt) await wait(800);
    try {
      res = await send();
    } catch {
      res = null;
      continue;
    }
    if (!(reads && [502, 503, 504].includes(res.status))) break;
  }
  if (!res) throw new ApiError(0, 'RESEAU', NETWORK_ERROR);
  if (res.status === 401 && init.auth !== false && session.load()) {
    const r = await refresh();
    if (r === 'ok') {
      try {
        res = await send();
      } catch {
        throw new ApiError(0, 'RESEAU', NETWORK_ERROR);
      }
    } else if (r === 'invalid') session.save(null);
    else throw new ApiError(0, 'RESEAU', NETWORK_ERROR);
  }
  return parse<T>(res);
}

export const errorText = (e: unknown) =>
  e instanceof ApiError ? e.message : 'Une erreur est survenue. Veuillez réessayer.';

const q = (params: Record<string, string | number | null | undefined>) => {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
};

// ---------- données publiques ----------

export interface Country {
  code: string; nameFr: string; currency: string; dialCode: string; emergencyNumber: string | null;
  /** Tarif d'une consultation fixé par l'administration (unités mineures), null = pas encore défini. */
  defaultFeeMinor: number | null;
  /** Moyens de paiement proposés à la réservation (réglés dans le centre d'administration). */
  onlinePayment: boolean;
  onSitePayment: boolean;
}
export interface Specialty { code: string; nameFr: string }
export interface Facility {
  id: string; name: string; countryCode: string; city: string | null; address: string | null; phone: string | null;
  organizationType: string | null;
}
export interface Practitioner {
  id: string; firstName: string; lastName: string; countryCode: string; specialties: Specialty[];
  consultationFeeMinor: number | null; feeCurrency: string | null; teleconsultationEnabled: boolean; bio: string | null;
}
export interface Page<T> { content: T[]; totalElements: number; totalPages: number; page: number }
export interface Slot { startsAt: string; endsAt: string; mode: 'IN_PERSON' | 'VIDEO'; facilityId: string | null }
export interface FaqEntry { id: string; questionFr: string; answerFr: string }
export interface News {
  id: string; title: string; body: string | null; imageUrl: string | null; linkUrl: string | null;
  videoUrl: string | null; countryCode: string | null; publishedAt: string;
}
export interface AppConfig { whatsappNumber: string | null; whatsappHours: string | null }

export const getCountries = () => api<Country[]>('/api/v1/countries', { auth: false });
let specialtiesCache: Promise<Specialty[]> | null = null;
/** Liste des spécialités : chargée une seule fois par visite. */
export const getSpecialties = () =>
  (specialtiesCache ??= api<Specialty[]>('/api/v1/specialties', { auth: false }).catch((e) => {
    specialtiesCache = null;
    throw e;
  }));
export const getFacilities = (countryCode?: string) =>
  api<Facility[]>(`/api/v1/facilities${q({ countryCode })}`, { auth: false });
export const findFacility = async (id: string) => (await getFacilities()).find((f) => f.id === id) ?? null;
export const getFacilitySpecialties = (id: string) =>
  api<Specialty[]>(`/api/v1/facilities/${id}/specialties`, { auth: false });
export const searchPractitioners = (p: { countryCode?: string; specialty?: string; q?: string; facilityId?: string; page?: number }) =>
  api<Page<Practitioner>>(`/api/v1/practitioners${q({ ...p, size: 20 })}`, { auth: false });
export const getPractitioner = (id: string) => api<Practitioner>(`/api/v1/practitioners/${id}`, { auth: false });
export const getSlots = (id: string, from: string, to: string, facilityId?: string) =>
  api<Slot[]>(`/api/v1/practitioners/${id}/slots${q({ from, to, mode: 'IN_PERSON', facilityId })}`, { auth: false });
export const getAppConfig = () => api<AppConfig>('/api/v1/app-config', { auth: false });
/** Actualités publiques (destinées aux patients) : toute l'Afrique + le pays choisi. */
export const getNews = (countryCode?: string, size = 12) =>
  api<Page<News>>(`/api/v1/news?size=${size}${countryCode ? `&countryCode=${countryCode}` : ''}`, { auth: false });
export const getFaq = () => api<FaqEntry[]>('/api/v1/faq?audience=PATIENT', { auth: false });

// ---------- connexion et inscription des patients ----------

function open(data: AuthData) {
  session.save({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
}

const DEVICE_KEY = 'ollisante-site-device';
const readDevice = () => {
  try {
    return localStorage.getItem(DEVICE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
};

/** Double authentification activée : le mot de passe est bon, un code vient d'être envoyé par e-mail. */
export interface LoginChallenge { challengeId: string; emailHint: string }

/** Ouvre la session, ou renvoie le défi à relever si la double authentification est activée sur le compte. */
export async function loginWithPassword(identifier: string, password: string): Promise<LoginChallenge | null> {
  const data = await api<AuthData & { verificationRequired?: boolean; challengeId?: string; emailHint?: string }>('/api/v1/auth/login', {
    method: 'POST', body: { identifier, password, deviceToken: readDevice() }, auth: false,
  });
  if (data.verificationRequired) {
    if (data.user?.role === 'ADMIN') {
      throw new ApiError(403, 'ESPACE_ADMIN', 'Les administrateurs se connectent depuis le centre d’administration.');
    }
    return { challengeId: data.challengeId!, emailHint: data.emailHint ?? '' };
  }
  open(data);
  return null;
}

/** Code reçu par e-mail ; « appareil de confiance » : plus de code sur ce navigateur pendant 30 jours. */
export async function verifyLogin(challengeId: string, code: string, rememberDevice: boolean) {
  const r = await api<{ auth: AuthData; deviceToken: string | null }>('/api/v1/auth/login/verify', {
    method: 'POST', body: { challengeId, code, rememberDevice }, auth: false,
  });
  if (r.deviceToken) {
    try {
      localStorage.setItem(DEVICE_KEY, r.deviceToken);
    } catch {
      // sans stockage, le code sera redemandé à la prochaine connexion
    }
  }
  open(r.auth);
}

/** Inscription d'un médecin : le compte est ouvert tout de suite, le profil reste invisible jusqu'à la vérification. */
export async function registerPractitioner(body: {
  email: string; phone: string; password: string; firstName: string; lastName: string; countryCode: string;
  licenseNumber: string; specialtyCodes: string[]; locale: string;
}) {
  open(await api<AuthData>('/api/v1/auth/register/practitioner', { method: 'POST', body, auth: false }));
  campaignSignup();
}

export const startSignup = (body: { email: string; password: string; firstName: string; lastName: string }) =>
  api<{ expiresInSeconds: number }>('/api/v1/auth/register/patient/start', {
    method: 'POST', body: { ...body, locale: 'fr' }, auth: false,
  });

export async function verifySignup(email: string, code: string) {
  open(await api<AuthData>('/api/v1/auth/register/patient/verify', { method: 'POST', body: { email, code }, auth: false }));
  campaignSignup();
}

export const requestSmsCode = (phone: string) =>
  api<{ expiresInSeconds: number }>('/api/v1/auth/otp/request', { method: 'POST', body: { phone, locale: 'fr' }, auth: false });

export async function verifySmsCode(body: { phone: string; code: string; firstName?: string; lastName?: string }) {
  open(await api<AuthData>('/api/v1/auth/otp/verify', { method: 'POST', body: { ...body, locale: 'fr' }, auth: false }));
  // Avec un prénom, c'est la création d'un compte par SMS (sinon une simple connexion).
  if (body.firstName) campaignSignup();
}

export const forgotPassword = (email: string) =>
  api<unknown>('/api/v1/auth/password/forgot', { method: 'POST', body: { email, locale: 'fr' }, auth: false });

export async function resetPassword(email: string, code: string, newPassword: string) {
  open(await api<AuthData>('/api/v1/auth/password/reset', { method: 'POST', body: { email, code, newPassword }, auth: false }));
}

export async function logout() {
  const s = session.load();
  session.save(null);
  if (s) {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: s.refreshToken }),
      });
    } catch {
      // déjà déconnecté localement
    }
  }
}

// ---------- rendez-vous et paiement ----------

export type AppointmentStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export interface Appointment {
  id: string; practitionerId: string; practitionerName: string; practitionerCountryCode: string;
  facilityName: string | null; startsAt: string; status: AppointmentStatus; mode: 'IN_PERSON' | 'VIDEO';
  patientName?: string; reason?: string | null;
  priceMinor: number | null; priceCurrency: string | null; paymentMode: 'ONLINE' | 'ON_SITE' | 'FREE';
}
export interface Operator { code: string; name: string }
export interface Payment { id: string; status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'; failureCode: string | null }
export interface CancellationPreview { paid: boolean; refundPercent: number; refundMinor: number; currency: string | null }

export type PaymentMethod = 'MOBILE_MONEY' | 'ON_SITE';
export const book = (body: { practitionerId: string; startsAt: string; mode: string; reason?: string; paymentMethod?: PaymentMethod; relativeId?: string }) =>
  api<Appointment>('/api/v1/appointments', { method: 'POST', body });
export const myAppointments = () => api<Appointment[]>('/api/v1/me/appointments');
export const cancellationPreview = (id: string) => api<CancellationPreview>(`/api/v1/appointments/${id}/cancellation`);
export const cancelAppointment = (id: string) => api<Appointment>(`/api/v1/appointments/${id}/cancel`, { method: 'POST', body: {} });
export const operators = (countryCode: string) => api<Operator[]>(`/api/v1/payments/operators${q({ countryCode })}`);
export const pay = (appointmentId: string, phone: string, operator: string) =>
  api<Payment>(`/api/v1/appointments/${appointmentId}/payments`, { method: 'POST', body: { phone, operator } });
export const getPayment = (id: string) => api<Payment>(`/api/v1/payments/${id}`);

// ---------- compte du patient ----------

export type Sex = 'FEMALE' | 'MALE' | 'OTHER';
export interface Profile {
  role: string; email: string | null; phone: string | null; hasPassword: boolean;
  /** Pays du compte : tout le site se limite à ce pays (null : pas encore connu). */
  countryCode: string | null;
  twoStepEnabled: boolean; notifyEmail: boolean; notifySms: boolean;
  patient: { firstName: string | null; lastName: string | null; birthDate: string | null; sex: Sex | null;
    countryCode: string | null; city: string | null; address: string | null } | null;
  practitioner?: { firstName: string; lastName: string; verificationStatus: string } | null;
  structure?: { name: string } | null;
}
export const getProfile = () => api<Profile>('/api/v1/me/profile');

/** Nom affiché dans l'en-tête : prénom et nom, « Dr … » pour un médecin, nom de la structure, sinon l'identifiant. */
export function profileName(p: Profile): string {
  const join = (a?: string | null, b?: string | null) => [a, b].filter(Boolean).join(' ').trim();
  if (p.structure?.name) return p.structure.name;
  if (p.practitioner) return `Dr ${join(p.practitioner.firstName, p.practitioner.lastName)}`;
  return join(p.patient?.firstName, p.patient?.lastName) || p.email || p.phone || 'Mon compte';
}

/** Prévient l'en-tête quand le profil change (ex. nom modifié dans Mes informations). */
export const PROFILE_EVENT = 'ollisante-profile';
export const updateProfile = (body: Partial<{ firstName: string; lastName: string; birthDate: string; sex: Sex;
  countryCode: string; city: string; address: string; twoStepEnabled: boolean; notifyEmail: boolean; notifySms: boolean }>) =>
  api<Profile>('/api/v1/me/profile', { method: 'PATCH', body }).then((p) => {
    window.dispatchEvent(new CustomEvent<Profile>(PROFILE_EVENT, { detail: p }));
    return p;
  });
export const changePassword = (currentPassword: string, newPassword: string) =>
  api<null>('/api/v1/me/password', { method: 'POST', body: { currentPassword, newPassword } });
export const deleteMyAccount = () => api<null>('/api/v1/me', { method: 'DELETE' });

// ---------- paiements et reçus du patient (aucune commission : il ne voit que ce qu'il paie) ----------

export interface BillingItem {
  appointmentId: string; paymentId: string | null; date: string; appointmentAt: string; practitioner: string;
  facility: string | null; amountMinor: number; currency: string; method: 'MOBILE_MONEY' | 'ON_SITE';
  status: 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'PENDING' | 'ON_SITE'; refundedMinor: number;
  operator: string | null; receiptNumber: string | null;
}
export interface PatientBilling {
  countryCode: string | null; methods: PaymentMethod[]; lastMobileMoney: { operator: string | null; phone: string | null } | null;
  items: BillingItem[];
}
export interface Receipt {
  number: string; issuedAt: string; issuer: string; payer: string; practitioner: string; facility: string | null;
  appointmentAt: string; amountMinor: number; refundedMinor: number; currency: string; operator: string | null;
  phone: string | null; status: string;
}
/** Médecin : encaissements en ligne, commission OLIDIA, net et reversements (jamais affichés au patient). */
export interface ProBilling {
  commissionPercent: number;
  monthTotals: { currency: string; onlineCount: number; grossMinor: number; commissionMinor: number; netMinor: number }[];
  onSiteThisMonth: number;
  payouts: { id: string; periodEnd: string; currency: string; grossMinor: number; commissionMinor: number; amountMinor: number; status: 'DUE' | 'PAID' }[];
  payments: { id: string; date: string; appointmentAt: string; patient: string; amountMinor: number; refundedMinor: number; netMinor: number; currency: string; status: string }[];
}
export const getBilling = () => api<{ role: string; patient: PatientBilling | null; pro: ProBilling | null }>('/api/v1/me/billing');
export const getReceipt = (paymentId: string) => api<Receipt>(`/api/v1/me/billing/receipts/${paymentId}`);
export const emailReceipt = (paymentId: string) =>
  api<null>(`/api/v1/me/billing/receipts/${paymentId}/email`, { method: 'POST', body: {} });

// ---------- mes proches (rendez-vous pris pour eux) ----------

export type Relation = 'CHILD' | 'PARENT' | 'SPOUSE' | 'OTHER';
export interface Relative { id: string; firstName: string; lastName: string; birthDate: string | null; sex: Sex | null; relation: Relation }
export type RelativeInput = Omit<Relative, 'id'>;
export const getRelatives = () => api<Relative[]>('/api/v1/me/relatives');
export const addRelative = (body: RelativeInput) => api<Relative>('/api/v1/me/relatives', { method: 'POST', body });
export const updateRelative = (id: string, body: RelativeInput) => api<Relative>(`/api/v1/me/relatives/${id}`, { method: 'PATCH', body });
export const deleteRelative = (id: string) => api<null>(`/api/v1/me/relatives/${id}`, { method: 'DELETE' });

// ---------- confiance : pièces justificatives des professionnels et signalements ----------

export type DocumentKind = 'ORDER_CARD' | 'ID_CARD' | 'DIPLOMA' | 'RCCM' | 'AUTHORIZATION' | 'OTHER';
export interface VerificationDocument { id: string; kind: DocumentKind; contentType: string; sizeBytes: number; createdAt: string }

export const getMyDocuments = () => api<VerificationDocument[]>('/api/v1/me/verification-documents');
export const deleteMyDocument = (id: string) => api<void>(`/api/v1/me/verification-documents/${id}`, { method: 'DELETE' });

/** Envoi d'une pièce (photo ou PDF) : formulaire multipart, avec renouvellement de session si besoin. */
export async function uploadMyDocument(kind: DocumentKind, file: File): Promise<VerificationDocument> {
  const send = () => {
    const form = new FormData();
    form.append('kind', kind);
    form.append('file', file);
    const s = session.load();
    return fetch('/api/v1/me/verification-documents', {
      method: 'POST',
      headers: s ? { Authorization: `Bearer ${s.accessToken}`, Accept: 'application/json' } : { Accept: 'application/json' },
      body: form,
    });
  };
  let res: Response;
  try {
    res = await send();
    if (res.status === 401 && (await refresh()) === 'ok') res = await send();
  } catch {
    throw new ApiError(0, 'RESEAU', NETWORK_ERROR);
  }
  return parse<VerificationDocument>(res);
}

export type ReportReason = 'FAKE_PROFILE' | 'WRONG_INFO' | 'BEHAVIOUR' | 'OTHER';
export const reportProfile = (targetType: 'PRACTITIONER' | 'FACILITY', targetId: string, reason: ReportReason, message: string) =>
  api<void>('/api/v1/reports', { method: 'POST', body: { targetType, targetId, reason, message: message.trim() || null } });
