import { FaqEntry, News, Specialty } from './api';
import { href } from './router';

/** Minuscules sans accents : « Généraliste » et « generaliste » se retrouvent. */
export const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, ' ').trim();

/** Mots du langage courant qui mènent à une spécialité (métier, organe, symptôme). */
const SYNONYMS: Record<string, string[]> = {
  GENERAL_PRACTICE: ['generaliste', 'medecin generaliste', 'medecin traitant', 'docteur', 'fievre', 'paludisme', 'palu', 'grippe', 'toux', 'rhume', 'diabete', 'bilan'],
  PEDIATRICS: ['pediatre', 'enfant', 'enfants', 'bebe', 'nourrisson'],
  GYNECOLOGY: ['gyneco', 'gynecologue', 'grossesse', 'enceinte', 'contraception', 'accouchement', 'regles'],
  CARDIOLOGY: ['cardiologue', 'coeur', 'tension', 'hypertension', 'palpitations'],
  DENTISTRY: ['dentiste', 'dent', 'dents', 'carie', 'gencive', 'gencives'],
  OPHTHALMOLOGY: ['ophtalmo', 'ophtalmologue', 'yeux', 'oeil', 'vue', 'lunettes'],
  DERMATOLOGY: ['dermato', 'dermatologue', 'peau', 'bouton', 'boutons', 'acne', 'eczema', 'demangeaison'],
  ENT: ['orl', 'oreille', 'oreilles', 'gorge', 'nez', 'angine', 'sinusite', 'otite'],
  PSYCHIATRY: ['psychiatre', 'psy', 'depression', 'stress', 'anxiete'],
  NEUROLOGY: ['neurologue', 'migraine', 'epilepsie'],
  ORTHOPEDICS: ['orthopediste', 'os', 'fracture', 'dos', 'genou', 'articulation'],
  UROLOGY: ['urologue', 'prostate', 'urine', 'reins'],
  GASTROENTEROLOGY: ['gastro', 'gastroenterologue', 'estomac', 'ventre', 'digestion', 'ulcere'],
  NUTRITION: ['nutritionniste', 'dieteticien', 'poids', 'regime'],
  RADIOLOGY: ['radiologue', 'radio', 'echographie', 'scanner', 'irm'],
  ANESTHESIOLOGY: ['anesthesiste', 'anesthesie'],
};

/** Thématiques de santé proposées dès la première lettre ; elles mènent à la page de résultats (infos, actualités, spécialités). */
export const TOPICS = [
  'Paludisme', 'Fièvre', 'Toux', 'Grippe', 'Rhume', 'Diabète', 'Hypertension', 'Tension artérielle', 'Grossesse',
  'Contraception', 'Accouchement', 'Vaccination', 'Rougeole', 'Choléra', 'Diarrhée', 'Maux de ventre', 'Mal de dents',
  'Carie', 'Acné', 'Eczéma', 'Démangeaisons', 'Angine', 'Otite', 'Sinusite', 'Vue', 'Yeux rouges', 'Lunettes',
  'Dépression', 'Stress', 'Anxiété', 'Migraine', 'Mal de dos', 'Fracture', 'Nutrition', 'Poids', 'Bilan de santé',
  'Bébé', 'Enfant malade', 'Cœur', 'Asthme', 'VIH', 'Hépatite', 'Typhoïde', 'Drépanocytose', 'Hygiène', 'Eau potable',
];
const TOPIC_KEYS = new Set(TOPICS.map(fold));

/**
 * Niveau de correspondance d'un libellé avec la saisie : 3 = le libellé commence par la saisie, 2 = un de ses mots
 * commence par la saisie, 1 = la saisie apparaît dedans (à partir de 3 lettres), 0 = aucune. Une seule lettre : seul
 * le début du libellé compte, pour des propositions précises.
 */
export function matchLevel(label: string, text: string): number {
  const t = fold(text);
  const l = fold(label);
  if (!t) return 0;
  if (l.startsWith(t)) return 3;
  if (t.length < 2) return 0;
  if (l.split(/[^a-z0-9]+/).some((w) => w.startsWith(t))) return 2;
  return t.length >= 3 && l.includes(t) ? 1 : 0;
}

/** Les éléments qui correspondent, les meilleurs d'abord (puis par ordre alphabétique). */
export function suggest<T>(text: string, items: T[], label: (x: T) => string, extra?: (x: T) => string): T[] {
  return items
    // Les mots-clés cachés ne comptent qu'à partir de 2 lettres, et jamais plus qu'un mot du libellé.
    .map((x) => ({ x, n: Math.max(matchLevel(label(x), text), extra && fold(text).length >= 2 ? Math.min(2, matchLevel(extra(x), text)) : 0) }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n || label(a.x).localeCompare(label(b.x), 'fr'))
    .map((r) => r.x);
}

/** Thématiques correspondant à la saisie, dès la première lettre. */
export const suggestTopics = (text: string) => suggest(text, TOPICS, (x) => x);

/** Spécialités correspondant à la saisie : par leur nom, ou par un mot courant qui commence par la saisie (2 lettres et plus). */
export const suggestSpecialties = (text: string, specialties: Specialty[]) =>
  suggest(text, specialties, (s) => s.nameFr, (s) => (fold(text).length >= 2 ? (SYNONYMS[s.code] ?? []).join(' ') : ''));

/** La recherche désigne-t-elle exactement une spécialité (son nom ou un métier, pas une maladie ni un symptôme) ? */
export function exactSpecialty(text: string, specialties: Specialty[]): Specialty | null {
  const t = fold(text);
  if (!t || TOPIC_KEYS.has(t)) return null;
  return specialties.find((s) => fold(s.nameFr) === t || (SYNONYMS[s.code] ?? []).includes(t)) ?? null;
}

/** Spécialités liées à la recherche : par leur nom, ou par un mot courant présent dans la phrase. */
export function matchSpecialties(text: string, specialties: Specialty[]): Specialty[] {
  const t = fold(text);
  if (t.length < 2) return [];
  const words = t.split(/[^a-z0-9]+/).filter(Boolean);
  return specialties.filter((s) => {
    const name = fold(s.nameFr);
    if (name.includes(t) || t.includes(name)) return true;
    return (SYNONYMS[s.code] ?? []).some((w) => w.startsWith(t) || words.includes(w) || (w.includes(' ') && t.includes(w)));
  });
}

export interface InfoPage { title: string; text: string; link: string; keywords: string }

/** Pages d'information du site, retrouvées par leurs mots-clés. */
export const PAGES: InfoPage[] = [
  { title: 'Tarifs des consultations', text: 'Le prix d’une consultation dans chaque pays et les moyens de paiement.', link: href('tarifs'), keywords: 'tarif tarifs prix cout combien payer paiement mobile money argent' },
  { title: 'Urgence médicale', text: 'Les numéros à appeler en cas d’urgence.', link: href('urgence'), keywords: 'urgence urgences urgent samu ambulance secours accident' },
  { title: 'Télécharger l’application', text: 'Ollisanté sur iPhone et Android.', link: href('application'), keywords: 'application appli telecharger iphone android mobile store' },
  { title: 'Centre d’aide', text: 'Les questions fréquentes et le contact WhatsApp.', link: href('aide'), keywords: 'aide question contact whatsapp support probleme assistance' },
  { title: 'Mon compte et mes rendez-vous', text: 'Connexion, inscription, rendez-vous à venir, annulation.', link: href('compte'), keywords: 'compte connexion connecter inscription inscrire mot passe profil rendez vous annuler' },
  { title: 'Médecins : rejoindre Ollisanté', text: 'Recevoir des rendez-vous en ligne.', link: href('professionnels/medecin'), keywords: 'medecin docteur professionnel rejoindre inscrire cabinet' },
  { title: 'Structures : rejoindre Ollisanté', text: 'Clinique, hôpital ou cabinet : vos médecins réservables en ligne.', link: href('professionnels/structure'), keywords: 'clinique hopital structure etablissement centre sante rejoindre' },
  { title: 'Conditions d’utilisation', text: 'Les règles du service, l’annulation et le remboursement.', link: '/legal/cgu.html', keywords: 'conditions cgu annulation rembourser remboursement regles' },
  { title: 'Confidentialité', text: 'Vos données personnelles et leur protection.', link: '/legal/confidentialite.html', keywords: 'donnees confidentialite vie privee securite supprimer compte' },
  { title: 'Mentions légales', text: 'L’éditeur du service.', link: '/legal/mentions-legales.html', keywords: 'mentions legales editeur societe' },
];

const STOP = new Set(['les', 'des', 'une', 'pour', 'avec', 'dans', 'sur', 'est', 'que', 'qui', 'mon', 'mes', 'votre', 'vos', 'comment', 'quoi', 'quel', 'quelle', 'faire', 'pas', 'aux', 'par', 'plus', 'son', 'ses']);
const terms = (text: string) => fold(text).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w));

/** Score d'un texte : nombre de mots de la recherche qu'il contient (début de mot accepté : « rembours » → « remboursement »). */
function score(query: string[], text: string): number {
  const words = fold(text).split(/[^a-z0-9]+/);
  return query.filter((q) => words.some((w) => w.startsWith(q) || (q.length > 4 && q.startsWith(w) && w.length >= 4))).length;
}

function rank<T>(text: string, items: T[], content: (x: T) => string): T[] {
  const q = terms(text);
  if (!q.length) return [];
  return items.map((x) => ({ x, s: score(q, content(x)) })).filter((r) => r.s > 0).sort((a, b) => b.s - a.s).map((r) => r.x);
}

export const searchPages = (text: string) => rank(text, PAGES, (p) => `${p.title} ${p.text} ${p.keywords}`);
export const searchFaq = (text: string, faq: FaqEntry[]) => rank(text, faq, (f) => `${f.questionFr} ${f.questionFr} ${f.answerFr}`);
export const searchNews = (text: string, news: News[]) => rank(text, news, (n) => `${n.title} ${n.title} ${n.body ?? ''}`);

/** Spécialités proposées avant toute saisie, des plus demandées aux moins demandées. */
const FREQUENT = ['GENERAL_PRACTICE', 'PEDIATRICS', 'GYNECOLOGY', 'CARDIOLOGY', 'DENTISTRY', 'OPHTHALMOLOGY', 'DERMATOLOGY', 'ENT'];
export const frequentSpecialties = (specialties: Specialty[]) =>
  FREQUENT.map((code) => specialties.find((s) => s.code === code)).filter((s): s is Specialty => !!s);
