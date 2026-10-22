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
	/** Lu dans la citation : « Lun A (salle) » → lundi, salle. */
	jour?: string;
	lieu?: string;
	exercices: Exercice[];
}

export interface Programme {
	accroche: string;
	seances: Seance[];
	regles: string[];
}

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const PLANNING = /\b(Lun|Mar|Mer|Jeu|Ven|Sam|Dim)\w*\.?\s+([A-Z])\s*\(([^)]+)\)/g;
const SEANCE = /^##\s+([A-Z])\s+—\s+(.+)$/;

/** Lit les séances (`## A —`…), leurs tableaux, la liste `## Règles` et la première ligne de citation. */
export function parseProgramme(markdown: string): Programme {
	const lines = markdown.split(/\r?\n/).map((l) => l.trim());
	const citation = lines.filter((l) => l.startsWith(">")).map((l) => l.replace(/^>\s*/, ""));
	const planning = new Map([...citation.join(" ").matchAll(PLANNING)].map((m) => [m[2], { jour: jourComplet(m[1]), lieu: m[3] }]));

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

/** La séance du jour, sinon la suivante dans la semaine ; la première si aucune n'a de jour. */
export function prochaineSeance(seances: Seance[], date: Date): number {
	let best = 0;
	let ecart = Infinity;
	seances.forEach((s, i) => {
		if (!s.jour) return;
		const e = (JOURS.indexOf(s.jour) - date.getDay() + 7) % 7;
		if (e < ecart) [best, ecart] = [i, e];
	});
	return best;
}

function jourComplet(court: string): string {
	return JOURS.find((j) => j.startsWith(court.toLowerCase()))!;
}
