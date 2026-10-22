// shortcut: le dossier de Mémora est écrit en dur, à passer dans les réglages s'il bouge encore.
export const DOSSIER_MEMORA = "0. INBOX/Mémora";

/** Le nom d'un souvenir, comme Mémora le donne : `Memora_2026-07-13_22h51_titre`. */
export function memoraName(date: Date, titre: string): string {
	const p = (n: number) => String(n).padStart(2, "0");
	const base = `Memora_${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}_${p(date.getHours())}h${p(date.getMinutes())}`;
	// Même nettoyage que Mémora : lettres françaises, chiffres, espace, _ et -, puis espaces en _.
	const label = titre.trim().replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ _-]/g, "").replace(/ /g, "_");
	return label ? `${base}_${label}` : base;
}
