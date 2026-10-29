const ZERO_DECIMAL = ['XOF', 'XAF', 'GNF', 'CDF', 'RWF'];

export const money = (minor: number, currency: string) =>
  `${(ZERO_DECIMAL.includes(currency) ? minor : minor / 100).toLocaleString('fr-FR')} ${currency}`;

export const flag = (code: string) =>
  String.fromCodePoint(...code.toUpperCase().split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const addDays = (d: Date, n: number) => {
  const c = new Date(d.getTime());
  c.setDate(c.getDate() + n);
  return c;
};

export const dayLabel = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
export const dayLong = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const time = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** Numéro local + indicatif → format international (+221771234567), ou null s'il est invalide. */
export function toInternational(dialCode: string, input: string): string | null {
  const t = input.trim();
  if (t.startsWith('+')) {
    const d = t.replace(/\D/g, '');
    return d.length >= 8 && d.length <= 15 ? `+${d}` : null;
  }
  const d = t.replace(/\D/g, '').replace(/^0+/, '');
  return d.length >= 6 && d.length <= 12 ? `${dialCode}${d}` : null;
}

export const initials = (first: string, last: string) => `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
