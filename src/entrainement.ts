/** La note qui fait foi : l'onglet Entraînement ne fait que la lire. */
export const PROGRAMME = "0. INBOX/Notes/Santé/💪 Programme Salle.md";
/** Une illustration par exercice, nommée exactement comme lui. */
export const illustration = (exercice: string) => `System/Ressources/Entraînement/${exercice}.png`;

export interface Exercice {
	nom: string;
	volume: string;
}

export interface Seance {
	lettre: string;
	/** « Haut lourd » pour « ## A — Haut lourd + squat ». */
	nom: string;
	/** Lu dans la citation : « Lun A (salle) » → salle. Le jour n'est pas lu : on va à la salle quand on peut. */
	lieu?: string;
	exercices: Exercice[];
}

export interface Programme {
	accroche: string;
	seances: Seance[];
	regles: string[];
}

const PLANNING = /\b([A-Z])\s*\(([^)]+)\)/g;
const SEANCE = /^##\s+([A-Z])\s+—\s+(.+)$/;

/** Lit les séances (`## A —`…), leurs tableaux, la liste `## Règles` et la première ligne de citation. */
export function parseProgramme(markdown: string): Programme {
	const lines = markdown.split(/\r?\n/).map((l) => l.trim());
	const citation = lines.filter((l) => l.startsWith(">")).map((l) => l.replace(/^>\s*/, ""));
	const planning = new Map([...citation.join(" ").matchAll(PLANNING)].map((m) => [m[1], { lieu: m[2] }]));

	const seances: Seance[] = [];
	const regles: string[] = [];
	let section: Seance | "regles" | null = null;
	for (const line of lines) {
		if (line.startsWith("## ")) {
			const m = line.match(SEANCE);
			section = m ? { lettre: m[1], nom: m[2].split(" + ")[0], ...planning.get(m[1]), exercices: [] } : /^##\s+Règles/i.test(line) ? "regles" : null;
			if (section && section !== "regles") seances.push(section);
		} else if (section === "regles" && /^[-*]\s+/.test(line)) {
			regles.push(line.replace(/^[-*]\s+/, ""));
		} else if (section && section !== "regles" && line.startsWith("|")) {
			const [nom, volume = ""] = line.split("|").slice(1, -1).map((c) => c.trim());
			if (nom && !/^-+$/.test(nom)) section.exercices.push({ nom, volume });
		}
	}
	// La première ligne de chaque tableau est son en-tête.
	for (const s of seances) s.exercices.shift();
	return { accroche: citation[0] ?? "", seances, regles };
}

/** La séance commencée aujourd'hui, sinon celle qui suit la dernière notée (A → B → C → A) ; la première sans Log. */
export function prochaineSeance(seances: Seance[], log: Ligne[], date: Date): number {
	const derniere = log[log.length - 1];
	const i = seances.findIndex((s) => s.lettre === derniere?.seance);
	if (i < 0) return 0;
	return derniere.date === jourLog(date) ? i : (i + 1) % seances.length;
}

/** Une ligne du tableau `## Log` : un exercice noté à la salle. */
export interface Ligne {
	date: string;
	seance: string;
	exercice: string;
	charge: string;
	reps: string;
}

const LOG = /^##\s+Log\b/i;
const EN_TETE = "| Date | Séance | Exercice | Charge | Reps |\n|---|---|---|---|---|";

/** La date telle qu'on l'écrit dans le Log : 22/10/2026. */
export const jourLog = (date: Date) => date.toLocaleDateString("fr-FR");

/** Les lignes du Log, de la plus ancienne à la plus récente. */
export function parseLog(markdown: string): Ligne[] {
	const lines = markdown.split(/\r?\n/);
	const [start, end] = logBounds(lines);
	if (start < 0) return [];
	return lines
		.slice(start + 1, end)
		.filter((l) => l.trim().startsWith("|"))
		.slice(2) // l'en-tête et le séparateur
		.map((l) => {
			const [date = "", seance = "", exercice = "", charge = "", reps = ""] = l.trim().split("|").slice(1, -1).map((c) => c.trim());
			return { date, seance, exercice, charge, reps };
		});
}

/** Ajoute une ligne au bas du Log ; crée l'en-tête, ou la section, s'il le faut. */
export function addLogRow(markdown: string, l: Ligne): string {
	const row = `| ${[l.date, l.seance, l.exercice, l.charge, l.reps].map((c) => c.replace(/\|/g, "/")).join(" | ")} |`;
	const lines = markdown.split("\n");
	const [start, end] = logBounds(lines);
	if (start < 0) return `${markdown.trimEnd()}\n\n## Log\n${EN_TETE}\n${row}\n`;
	let last = -1;
	for (let i = start + 1; i < end; i++) if (lines[i].trim().startsWith("|")) last = i;
	if (last < 0) lines.splice(start + 1, 0, EN_TETE, row);
	else lines.splice(last + 1, 0, row);
	return lines.join("\n");
}

/** Vrai quand les reps touchent le haut de la fourchette (« 4 × 6-8 » → 8) : la règle dit d'ajouter du poids. */
export function enHaut(volume: string, reps: string): boolean {
	const haut = volume.match(/×\s*(?:\d+\s*-\s*)?(\d+)$/)?.[1];
	return !!haut && Number(reps) >= Number(haut);
}

/** « 62,5 kg × 8 », ou ce qu'il en reste quand un champ est vide. */
export function resume(l: Ligne): string {
	if (l.charge && l.reps) return `${l.charge} kg × ${l.reps}`;
	return l.charge ? `${l.charge} kg` : l.reps ? `${l.reps} reps` : "";
}

/** La ligne du titre `## Log` et celle qui suit la fin de sa section ; [-1, -1] sans Log. */
function logBounds(lines: string[]): [number, number] {
	const start = lines.findIndex((l) => LOG.test(l.trim()));
	if (start < 0) return [-1, -1];
	const next = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
	return [start, next < 0 ? lines.length : next];
}
