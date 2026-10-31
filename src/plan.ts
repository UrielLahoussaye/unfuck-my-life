/**
 * Les notes de plan : une note marquée `type: plan` en tête, avec deux sections.
 *  - `## Objectifs` : une case par chiffre visé, « Nom : cible 📅 échéance ».
 *  - `## Jalons` : des cases datées au format du plugin Tasks — `📅` l'échéance, `🛫` le début d'une période,
 *    `#jalon` pour un moment qui compte.
 * La timeline lit ces lignes telles quelles et ne réécrit que la case qu'on coche.
 */

export interface Ligne {
	/** Le texte affiché, sans dates ni étiquette. */
	texte: string;
	/** Index de la ligne dans la note, pour cocher et ouvrir au bon endroit. */
	ligne: number;
	fait: boolean;
	/** Dates au format AAAA-MM-JJ. */
	debut?: string;
	echeance?: string;
	jalon: boolean;
}

export interface Objectif extends Ligne {
	nom: string;
	cible?: string;
}

export interface Plan {
	path: string;
	projet: string;
	debut?: string;
	fin?: string;
	objectifs: Objectif[];
	jalons: Ligne[];
}

const CASE = /^[-*]\s+\[([ xX])\]\s+(.+)$/;
const DATE = "(\\d{4}-\\d{2}-\\d{2})";
const ECHEANCE = new RegExp(`📅\\s*${DATE}`);
const DEBUT = new RegExp(`🛫\\s*${DATE}`);
const JALON = /(^|\s)#jalon\b/;

/** Une note est un plan si son en-tête porte `type: plan`. */
export function estPlan(md: string): boolean {
	return /^type:\s*plan\s*$/m.test(entete(md));
}

export function parsePlan(md: string, path: string): Plan {
	const lignes = md.split("\n");
	const tete = entete(md);
	const plan: Plan = { path, projet: projetDe(path), debut: champ(tete, "debut"), fin: champ(tete, "fin"), objectifs: [], jalons: [] };
	let section: "objectifs" | "jalons" | null = null;
	lignes.forEach((brute, i) => {
		const l = brute.trimEnd();
		const titre = l.match(/^##\s+(.+)$/);
		if (titre) {
			const nom = titre[1].trim().toLowerCase();
			section = nom.startsWith("objectif") ? "objectifs" : nom.startsWith("jalon") ? "jalons" : null;
			return;
		}
		const c = l.match(CASE);
		if (!c || !section) return;
		const ligne = lireLigne(c[2], i, c[1] !== " ");
		if (section === "jalons") plan.jalons.push(ligne);
		else {
			const [nom, ...cible] = ligne.texte.split(" : ");
			plan.objectifs.push({ ...ligne, nom: nom.trim(), cible: cible.join(" : ").trim() || undefined });
		}
	});
	return plan;
}

function lireLigne(contenu: string, ligne: number, fait: boolean): Ligne {
	const texte = contenu.replace(ECHEANCE, "").replace(DEBUT, "").replace(JALON, " ").replace(/\s+/g, " ").trim();
	return { texte, ligne, fait, debut: contenu.match(DEBUT)?.[1], echeance: contenu.match(ECHEANCE)?.[1], jalon: JALON.test(contenu) };
}

/** Coche ou décoche la case de la ligne `ligne`, seulement si elle porte toujours ce texte. Sinon, la note reste telle quelle. */
export function basculer(md: string, ligne: number, texte: string): string {
	const lignes = md.split("\n");
	const c = lignes[ligne]?.trimEnd().match(CASE);
	if (!c || lireLigne(c[2], ligne, false).texte !== texte) return md;
	lignes[ligne] = lignes[ligne].replace(/\[([ xX])\]/, c[1] === " " ? "[x]" : "[ ]");
	return lignes.join("\n");
}

/** « 1. LE MÉTIER/1. Runes de Chêne/Plan.md » → « Runes de Chêne » : le dossier de la note, sans son numéro. */
export function projetDe(path: string): string {
	const dossiers = path.split("/").slice(0, -1);
	return (dossiers.pop() ?? "").replace(/^\d+\.\s*/, "") || "Vault";
}

export interface Fenetre {
	debut: string;
	fin: string;
}

/** La fenêtre de la frise : celle des plans, sinon celle de leurs dates, élargie aux mois entiers. */
export function fenetre(plans: Plan[]): Fenetre | null {
	const dates = plans.flatMap((p) => [p.debut, p.fin, ...p.jalons.flatMap((j) => [j.debut, j.echeance])]).filter((d): d is string => !!d).sort();
	if (!dates.length) return null;
	const debut = dates[0].slice(0, 8) + "01";
	const [a, m] = dates[dates.length - 1].split("-").map(Number);
	return { debut, fin: iso(new Date(Date.UTC(a, m, 0))) };
}

/** Où tombe une date dans la fenêtre, de 0 (premier jour) à 1 (fin du dernier) ; hors fenêtre, borné. */
export function position(date: string, f: Fenetre): number {
	const total = jours(f.debut, f.fin) + 1;
	return Math.min(Math.max(jours(f.debut, date) / total, 0), 1);
}

/** Fin d'une bande ou d'une date : le soir du jour. */
export function positionFin(date: string, f: Fenetre): number {
	return position(lendemain(date), f);
}

export interface Mois {
	nom: string;
	debut: number;
	fin: number;
}

/** Les mois de la fenêtre, avec leur place sur la frise. */
export function moisDe(f: Fenetre): Mois[] {
	const out: Mois[] = [];
	let [a, m] = f.debut.split("-").map(Number);
	while (iso(new Date(Date.UTC(a, m - 1, 1))) <= f.fin) {
		const premier = iso(new Date(Date.UTC(a, m - 1, 1)));
		const suivant = iso(new Date(Date.UTC(a, m, 1)));
		const nom = new Date(Date.UTC(a, m - 1, 1)).toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" });
		out.push({ nom, debut: position(premier, f), fin: suivant > f.fin ? 1 : position(suivant, f) });
		m++;
		if (m > 12) { m = 1; a++; }
	}
	return out;
}

/** « 2026-11-15 » → « 15 nov. » */
export function dateCourte(date: string): string {
	return new Date(date + "T00:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
}

export const aujourdhui = (now = new Date()) => iso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));

function entete(md: string): string {
	return md.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
}

function champ(tete: string, nom: string): string | undefined {
	return tete.match(new RegExp(`^${nom}:\\s*${DATE}\\s*$`, "m"))?.[1];
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const jours = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 864e5;
const lendemain = (d: string) => iso(new Date(Date.parse(d) + 864e5));
