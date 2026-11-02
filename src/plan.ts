/**
 * Les notes de plan : une note marquée `type: plan` en tête, avec deux sections.
 *  - `## Objectifs` : une case par chiffre visé, « Nom : cible 📅 échéance ».
 *  - `## Jalons` : des cases datées au format du plugin Tasks — `📅` l'échéance, `🛫` le début d'une période,
 *    `#jalon` pour un moment qui compte.
 * La timeline lit ces lignes telles quelles et ne réécrit que la case qu'on coche.
 */

import { cocher, decocher, FAIT_LE } from "./etat";

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
	/** `[mesure:: boutique.ca + fellowship.ca]` : ce que lisent les connecteurs. */
	mesure?: string;
	/** `[depart:: 4 000 €]` : la cible du premier mois ; elle monte ensuite jusqu'à la cible finale. */
	depart?: string;
	/** `[periode:: mois|semaine|trimestre|plan]` ; sans champ, devinée par le nom et l'unité. */
	periode?: Periode;
	/** Les mois forcés à la main, sous la ligne : `- déc. : 12 000 €`, rangés par AAAA-MM une fois le plan lu. */
	forces: { mois: string; valeur: string }[];
}

export type Periode = "mois" | "semaine" | "trimestre" | "plan";

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
/** Champ inline au format Dataview : `[nom:: valeur]`. */
const INLINE = /\[[\w-]+::[^\]]*\]/g;

function champInline(contenu: string, nom: string): string | undefined {
	return contenu.match(new RegExp(`\\[${nom}::\\s*([^\\]]*)\\]`))?.[1].trim() || undefined;
}

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
		const sous = l.match(/^\s+[-*]\s+([^:]+?)\s*:\s*(.+)$/);
		if (sous && section === "objectifs" && plan.objectifs.length) {
			plan.objectifs[plan.objectifs.length - 1].forces.push({ mois: sous[1].trim(), valeur: sous[2].trim() });
			return;
		}
		const c = l.match(CASE);
		if (!c || !section) return;
		const ligne = lireLigne(c[2], i, c[1] !== " ");
		if (section === "jalons") plan.jalons.push(ligne);
		else {
			const [nom, ...cible] = ligne.texte.split(" : ");
			const periode = champInline(c[2], "periode");
			plan.objectifs.push({
				...ligne,
				nom: nom.trim(),
				cible: cible.join(" : ").trim() || undefined,
				mesure: champInline(c[2], "mesure"),
				depart: champInline(c[2], "depart"),
				periode: periode === "mois" || periode === "semaine" || periode === "trimestre" || periode === "plan" ? periode : undefined,
				forces: [],
			});
		}
	});
	return plan;
}

function lireLigne(contenu: string, ligne: number, fait: boolean): Ligne {
	const texte = contenu.replace(FAIT_LE, "").replace(ECHEANCE, "").replace(DEBUT, "").replace(JALON, " ").replace(INLINE, " ").replace(/\s+/g, " ").trim();
	return { texte, ligne, fait, debut: contenu.match(DEBUT)?.[1], echeance: contenu.match(ECHEANCE)?.[1], jalon: JALON.test(contenu) };
}

/** Coche (avec la date du jour, ✅) ou décoche la case de la ligne `ligne`, seulement si elle porte toujours ce texte. Sinon, la note reste telle quelle. */
export function basculer(md: string, ligne: number, texte: string, jour = aujourdhui()): string {
	const lignes = md.split("\n");
	const c = lignes[ligne]?.trimEnd().match(CASE);
	if (!c || lireLigne(c[2], ligne, false).texte !== texte) return md;
	lignes[ligne] = c[1] === " " ? cocher(lignes[ligne], jour) : decocher(lignes[ligne]);
	return lignes.join("\n");
}

/** Un connecteur renommé : `ancien.mesure` devient `nouveau.mesure`, dans les champs [mesure:: …] seulement. */
export function renommer(md: string, ancien: string, nouveau: string): string {
	if (!ancien || !nouveau || ancien === nouveau) return md;
	const terme = new RegExp(`(^|[\\s+/])${ancien.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")}\\.`, "g");
	return md.replace(/\[mesure::([^\]]*)\]/g, (_, expr: string) => `[mesure::${expr.replace(terme, `$1${nouveau}.`)}]`);
}

/** Un jalon à écrire, tel que la fenêtre « + Jalon » le saisit. */
export interface NouveauJalon {
	texte: string;
	echeance: string;
	debut?: string;
	jalon: boolean;
}

/**
 * Écrit la case `- [ ] texte #jalon 🛫 début 📅 échéance` dans `## Jalons`, sous le `### Mois` de son échéance,
 * après les cases qui tombent avant elle. Un mois sans sous-titre en reçoit un, rangé dans l'ordre des mois ;
 * une note sans `## Jalons` reçoit la section à la fin.
 */
export function ajouterJalon(md: string, j: NouveauJalon): string {
	const ym = j.echeance.slice(0, 7);
	const titreDuMois = `### ${nomMois(ym).replace(/^./, (c) => c.toUpperCase())}`;
	const ligne = `- [ ] ${j.texte.trim()}${j.jalon ? " #jalon" : ""}${j.debut ? ` 🛫 ${j.debut}` : ""} 📅 ${j.echeance}`;
	const lignes = md.split("\n");
	const section = lignes.findIndex((l) => /^##\s+jalon/i.test(l));
	if (section < 0) return `${md.replace(/\n*$/, "")}\n\n## Jalons\n\n${titreDuMois}\n${ligne}\n`;

	const suite = lignes.findIndex((l, i) => i > section && /^##\s/.test(l));
	const fin = suite < 0 ? lignes.length : suite;
	// Un sous-titre « ### Novembre — armer Noël » se lit dans la période du plan (ou l'année de l'échéance).
	const tete = entete(md);
	const premier = champ(tete, "debut")?.slice(0, 7) ?? `${ym.slice(0, 4)}-01`;
	const dernier = champ(tete, "fin")?.slice(0, 7) ?? `${ym.slice(0, 4)}-12`;
	const moisDuTitre = (l: string) => moisDuNom(l.match(/^###\s+([^—–-]+)/)?.[1] ?? "", premier, dernier);
	const titres = [...lignes.keys()].filter((i) => i > section && i < fin && /^###\s/.test(lignes[i]));

	const titre = titres.find((i) => moisDuTitre(lignes[i]) === ym);
	if (titre !== undefined) {
		let ou = titre + 1;
		for (let i = titre + 1; i < fin && !lignes[i].startsWith("#"); i++) {
			const date = lignes[i].match(ECHEANCE)?.[1];
			if (CASE.test(lignes[i]) && (!date || date <= j.echeance)) ou = i + 1;
		}
		lignes.splice(ou, 0, ligne);
	} else {
		let ou = titres.find((i) => (moisDuTitre(lignes[i]) ?? "") > ym) ?? fin;
		while (ou > section + 1 && lignes[ou - 1].trim() === "") ou--;
		lignes.splice(ou, 0, "", titreDuMois, ligne);
	}
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
/** « 2026-12 » → « décembre ». */
const nomMois = (ym: string) => new Date(ym + "-01T00:00:00Z").toLocaleDateString("fr-FR", { month: "long", timeZone: "UTC" });
const jours = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 864e5;
const lendemain = (d: string) => iso(new Date(Date.parse(d) + 864e5));

/** « 50 par week-end » → valeur « 50 », unité « par week-end » : le chiffre en grand, le reste en petit. Sans chiffre en tête, tout est la valeur. */
export function chiffre(cible: string): { valeur: string; unite?: string } {
	const m = cible.match(/^([\d][\d\s.,]*(?:\s?(?:%|k€|€))?)\s*(.*)$/);
	if (!m) return { valeur: cible };
	return { valeur: m[1].trim(), unite: m[2].trim() || undefined };
}

/** « 10 000 € » → 10000, « 30 % » → 30, « 50 par week-end » → 50. Sans chiffre en tête : null. */
export function nombre(texte: string): number | null {
	const v = chiffre(texte).valeur.replace(/[^\d,.]/g, "").replace(",", ".");
	return v && /\d/.test(v) ? Number(v) : null;
}

/** Écrit `n` sur le modèle de `cible` : même suffixe (€, %), espaces des milliers. */
export function commeCible(n: number, cible: string): string {
	const { valeur } = chiffre(cible);
	const suffixe = valeur.match(/\s?(%|k€|€)$/)?.[0] ?? "";
	const arrondi = Math.abs(n) >= 10 ? Math.round(n) : Math.round(n * 10) / 10;
	return arrondi.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ") + suffixe;
}

/** La période d'un objectif : son champ, sinon « par mois », « par semaine » ou « par week-end » dans le nom ou l'unité, sinon tout le plan. */
export function periodeDe(o: Objectif): Periode {
	if (o.periode) return o.periode;
	const t = `${o.nom} ${o.cible ?? ""}`.toLowerCase();
	if (/trois mois|3 mois|trimestre/.test(t)) return "trimestre";
	if (/par mois|\/\s?mois/.test(t)) return "mois";
	if (/semaine|week-end/.test(t)) return "semaine";
	return "plan";
}

/** Les bornes de la période, au jour `jour` (AAAA-MM-JJ). */
export function bornes(periode: Periode, jour: string, plan: Plan): Fenetre {
	if (periode === "mois") {
		const [a, m] = jour.split("-").map(Number);
		return { debut: jour.slice(0, 8) + "01", fin: iso(new Date(Date.UTC(a, m, 0))) };
	}
	if (periode === "semaine") return { debut: iso(new Date(Date.parse(jour) - 6 * 864e5)), fin: jour };
	if (periode === "trimestre") return { debut: iso(new Date(Date.parse(jour) - 89 * 864e5)), fin: jour };
	return { debut: plan.debut ?? jour, fin: jour };
}

export interface Palier {
	/** La cible du moment, au format de la cible finale. */
	valeur: string;
	/** « novembre », ou null quand c'est la cible finale. */
	mois: string | null;
}

/**
 * La cible du mois de `jour`. Un mois forcé gagne ; sinon, avec un départ, une ligne droite du premier mois du plan
 * (le départ) au mois de l'échéance (la cible finale) ; sinon la cible finale seule.
 */
export function palier(o: Objectif, plan: Plan, jour: string): Palier | null {
	if (!o.cible) return null;
	const debut = (plan.debut ?? jour).slice(0, 7);
	const fin = (o.echeance ?? plan.fin ?? jour).slice(0, 7);
	const ici = jour.slice(0, 7);
	const force = o.forces.find((f) => moisDuNom(f.mois, debut, fin) === ici);
	if (force) return { valeur: force.valeur, mois: nomMois(ici) };
	const a = o.depart ? nombre(o.depart) : null;
	const b = nombre(o.cible);
	if (a === null || b === null || ici >= fin) return { valeur: o.cible, mois: periodeDe(o) === "mois" ? nomMois(ici) : null };
	const total = ecartMois(debut, fin);
	const rang = Math.max(ecartMois(debut, ici), 0);
	return { valeur: commeCible(a + ((b - a) * rang) / Math.max(total, 1), o.cible), mois: nomMois(ici) };
}

/** « déc. », « décembre » → l'AAAA-MM de ce mois dans [debut, fin] (AAAA-MM). */
export function moisDuNom(nom: string, debut: string, fin: string): string | undefined {
	const cle = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f.]/g, "").trim();
	for (let ym = debut; ym <= fin; ym = moisSuivant(ym)) {
		const d = new Date(ym + "-01T00:00:00Z");
		const noms = [{ month: "long" }, { month: "short" }].map((o) => cle(d.toLocaleDateString("fr-FR", { ...(o as Intl.DateTimeFormatOptions), timeZone: "UTC" })));
		if (noms.includes(cle(nom))) return ym;
	}
	return undefined;
}

const moisSuivant = (ym: string) => {
	const [a, m] = ym.split("-").map(Number);
	return iso(new Date(Date.UTC(a, m, 1))).slice(0, 7);
};
const ecartMois = (a: string, b: string) => {
	const [ya, ma] = a.split("-").map(Number);
	const [yb, mb] = b.split("-").map(Number);
	return (yb - ya) * 12 + (mb - ma);
};

/** L'écart à la cible, signé comme la flèche : « +25 % » au-dessus, « −23 % » en dessous. Sans cible : rien. */
export function ecart(atteint: number, vise: number): { texte: string; dessus: boolean } | null {
	if (!(vise > 0)) return null;
	const dessus = atteint >= vise;
	const n = Math.round(Math.abs(atteint / vise - 1) * 100);
	return { texte: `${dessus ? "+" : "−"}${n} %`, dessus };
}
