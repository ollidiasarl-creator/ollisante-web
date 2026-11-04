/**
 * Questionnaire « Quel médecin consulter ? », validé par un médecin le 4 novembre 2026. Il oriente, il ne pose pas de
 * diagnostic. Les réponses restent dans le navigateur : rien n'est envoyé ni enregistré sur le serveur.
 */
export type Who = 'adult' | 'child' | 'baby' | 'pregnant';

export const WHO: { id: Who; label: string }[] = [
  { id: 'adult', label: 'Un adulte' },
  { id: 'child', label: 'Un enfant de 3 mois à 15 ans' },
  { id: 'baby', label: 'Un bébé de moins de 3 mois' },
  { id: 'pregnant', label: 'Une femme enceinte' },
];

const ALL: Who[] = ['adult', 'child', 'baby', 'pregnant'];

/** Signes de gravité : un seul coché, et on oriente vers les secours. */
export const RED_FLAGS: { label: string; who: Who[] }[] = [
  { label: 'Grande difficulté à respirer, lèvres bleues', who: ALL },
  { label: 'Douleur ou serrement dans la poitrine', who: ['adult', 'pregnant'] },
  { label: 'Perte de connaissance, convulsions', who: ALL },
  { label: 'Bouche tordue, bras ou jambe qui ne bouge plus, parole difficile', who: ['adult', 'pregnant'] },
  { label: 'Saignement abondant qui ne s’arrête pas', who: ALL },
  { label: 'Accident grave, chute de haut, brûlure étendue', who: ALL },
  { label: 'Fièvre avec nuque raide ou taches sur la peau qui ne s’effacent pas à la pression', who: ALL },
  { label: 'Confusion, très grande somnolence, ne répond plus normalement', who: ALL },
  { label: 'Enfant ou bébé qui ne boit plus, ne se réveille pas bien, ou vomit tout', who: ['child', 'baby'] },
  { label: 'Toute fièvre (38 °C ou plus)', who: ['baby'] },
  { label: 'Saignement, douleur forte au ventre, perte de liquide, bébé qui ne bouge plus', who: ['pregnant'] },
  { label: 'Fièvre forte avec vomissements répétés ou urines foncées (paludisme grave possible)', who: ALL },
  { label: 'Envie de mettre fin à ses jours', who: ['adult', 'child'] },
];

const GP = 'GENERAL_PRACTICE', PED = 'PEDIATRICS', GYN = 'GYNECOLOGY';

/** Motif principal → spécialité(s) conseillée(s) selon la personne : [adulte, enfant ou bébé, femme enceinte]. */
export const REASONS: { label: string; adult: string[]; child: string[]; pregnant: string[] }[] = [
  { label: 'Fièvre, paludisme, fatigue, infection', adult: [GP], child: [PED], pregnant: [GYN] },
  { label: 'Toux, gorge, oreilles, nez, sinus', adult: [GP, 'ENT'], child: [PED], pregnant: [GP] },
  { label: 'Ventre, diarrhée, vomissements, digestion', adult: [GP, 'GASTROENTEROLOGY'], child: [PED], pregnant: [GYN] },
  { label: 'Peau : boutons, démangeaisons, taches', adult: ['DERMATOLOGY'], child: [PED, 'DERMATOLOGY'], pregnant: ['DERMATOLOGY'] },
  { label: 'Yeux : vue, yeux rouges, douleur', adult: ['OPHTHALMOLOGY'], child: ['OPHTHALMOLOGY'], pregnant: ['OPHTHALMOLOGY'] },
  { label: 'Dents, gencives, bouche', adult: ['DENTISTRY'], child: ['DENTISTRY'], pregnant: ['DENTISTRY'] },
  { label: 'Cœur, tension, palpitations', adult: ['CARDIOLOGY'], child: [PED], pregnant: [GYN] },
  { label: 'Règles, contraception, suivi de grossesse', adult: [GYN], child: [PED], pregnant: [GYN] },
  { label: 'Os, articulations, dos, entorse', adult: ['ORTHOPEDICS'], child: [PED, 'ORTHOPEDICS'], pregnant: [GP] },
  { label: 'Tête : migraine, vertiges, engourdissements', adult: ['NEUROLOGY'], child: [PED], pregnant: [GYN] },
  { label: 'Moral, stress, sommeil, anxiété', adult: ['PSYCHIATRY'], child: [PED], pregnant: [GP] },
  { label: 'Urines, reins, prostate', adult: ['UROLOGY'], child: [PED], pregnant: [GYN] },
  { label: 'Poids, alimentation, suivi du diabète', adult: ['NUTRITION'], child: [PED], pregnant: [GYN] },
  { label: 'Bilan, certificat, vaccin, renouvellement d’ordonnance', adult: [GP], child: [PED], pregnant: [GYN] },
  { label: 'Autre ou je ne sais pas', adult: [GP], child: [PED], pregnant: [GYN] },
];

export function specialtiesFor(reason: (typeof REASONS)[number], who: Who): string[] {
  const list = who === 'adult' ? reason.adult : who === 'pregnant' ? reason.pregnant : reason.child;
  // Dans le doute, la médecine générale (ou la pédiatrie pour un enfant) est toujours proposée en second choix.
  const fallback = who === 'child' || who === 'baby' ? PED : GP;
  return list.includes(fallback) ? list : [...list, fallback];
}

export const DURATIONS: { id: string; label: string; advice: string }[] = [
  { id: 'today', label: 'Depuis aujourd’hui', advice: 'Consultez dans les prochains jours si cela ne passe pas ; plus tôt si cela s’aggrave.' },
  { id: 'days', label: 'Depuis 2 à 3 jours', advice: 'Prenez rendez-vous rapidement.' },
  { id: 'fever', label: 'Plus de 3 jours avec de la fièvre', advice: 'Consultez aujourd’hui ou demain : une fièvre qui dure doit être examinée (paludisme possible).' },
  { id: 'long', label: 'Plus d’une semaine, ou depuis des mois', advice: 'Prenez rendez-vous : cela mérite un avis médical.' },
];

export const DISCLAIMER =
  'Cette orientation ne remplace pas l’avis d’un médecin. En cas de doute ou d’aggravation, consultez ou appelez les secours.';
