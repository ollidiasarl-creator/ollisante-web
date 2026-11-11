import { IMAGES_DEMO } from './brand';
import soinsTension from './assets/photos/soins-tension.jpg';
import tablettePatient from './assets/photos/tablette-patient.jpg';
import medecinTelephone from './assets/photos/medecin-telephone.jpg';
import stethoscope from './assets/photos/stethoscope.jpg';
import medecinsEcrans from './assets/photos/medecins-ecrans.jpg';
import soignant from './assets/photos/soignant.jpg';
import tabletteMedecin from './assets/photos/tablette-medecin.jpg';
import couloirHopital from './assets/photos/couloir-hopital.jpg';

/** Photos de la démo « images » (?images=demo), une par thème de page. */
const PHOTOS = {
  patient: { src: soinsTension, pos: '60% 35%' },
  orientation: { src: tablettePatient, pos: '50% 50%' },
  application: { src: medecinTelephone, pos: '50% 55%' },
  aide: { src: stethoscope, pos: '40% 30%' },
  medecin: { src: medecinsEcrans, pos: '55% 40%' },
  structure: { src: couloirHopital, pos: '50% 45%' },
  structures: { src: couloirHopital, pos: '50% 45%' },
  disponibilites: { src: tabletteMedecin, pos: '55% 45%' },
  recherche: { src: soignant, pos: '50% 35%' },
};

/** Bandeau photo en tête de page, visible seulement avec le lien de démo ; ailleurs, rien ne change. */
export function PhotoBanner({ theme }: { theme: keyof typeof PHOTOS }) {
  if (!IMAGES_DEMO) return null;
  const p = PHOTOS[theme];
  return <div className="photo-banner" style={{ backgroundImage: `url(${p.src})`, backgroundPosition: p.pos }} role="img" aria-hidden="true" />;
}
