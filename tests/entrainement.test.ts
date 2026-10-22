import { describe, expect, it } from "vitest";
import { addLogRow, enHaut, parseLog, parseProgramme, prochaineSeance, resume } from "../src/entrainement";

const note = `---
statut: actif
---
# 💪 Programme

> Allure de beau guerrier : encaisser les coups.
> 3 séances/semaine : Lun A (salle) · Mer B (terrain) · Ven C (salle).

## A — Haut lourd + squat\r
| Exercice | Séries × reps |
|---|---|
| Développé militaire debout | 4 × 5-6 |
| Tractions | 4 × 6-8 |

## B — Terrain
| Exercice | Volume |
|---|---|
| Sprints en côte | 6 × 10-15 s |

## C — Haut volume + soulevé de terre
| Exercice | Séries × reps |
|---|---|
| Développé couché | 4 × 6-8 |

## Règles
- Haut de fourchette → +poids.
- Pesée 3 matins/sem.

## Log
| Date | Séance | Exercice | Charge | Reps |
|---|---|---|---|---|
| 20/10 | A | Tractions | 0 | 10 |

## Repères
- DC haltères 14 kg × 10
`;

describe("parseProgramme", () => {
	const p = parseProgramme(note);
	it("lit chaque séance, son lieu et ses exercices, sans l'en-tête du tableau", () => {
		expect(p.seances).toEqual([
			{ lettre: "A", nom: "Haut lourd", lieu: "salle", exercices: [{ nom: "Développé militaire debout", volume: "4 × 5-6" }, { nom: "Tractions", volume: "4 × 6-8" }] },
			{ lettre: "B", nom: "Terrain", lieu: "terrain", exercices: [{ nom: "Sprints en côte", volume: "6 × 10-15 s" }] },
			{ lettre: "C", nom: "Haut volume", lieu: "salle", exercices: [{ nom: "Développé couché", volume: "4 × 6-8" }] },
		]);
	});
	it("lit les règles et ignore le Log et les Repères", () => {
		expect(p.regles).toEqual(["Haut de fourchette → +poids.", "Pesée 3 matins/sem."]);
	});
	it("prend la première ligne de citation comme accroche", () => {
		expect(p.accroche).toBe("Allure de beau guerrier : encaisser les coups.");
	});
	it("rend un programme vide pour une note vide", () => {
		expect(parseProgramme("")).toEqual({ accroche: "", seances: [], regles: [] });
	});
});

describe("prochaineSeance", () => {
	const { seances } = parseProgramme(note);
	const soir = new Date("2026-10-22T20:00:00");
	const ligne = (date: string, seance: string) => ({ date, seance, exercice: "X", charge: "", reps: "" });
	it("ouvre la séance qui suit la dernière notée, quel que soit le jour", () => {
		expect(prochaineSeance(seances, [ligne("15/10/2026", "C"), ligne("20/10/2026", "A")], soir)).toBe(1);
		expect(prochaineSeance(seances, [ligne("20/10/2026", "C")], soir)).toBe(0); // C → A
	});
	it("reste sur la séance commencée aujourd'hui", () => {
		expect(prochaineSeance(seances, [ligne("22/10/2026", "A")], soir)).toBe(0);
	});
	it("ouvre la première sans Log", () => {
		expect(prochaineSeance(seances, [], soir)).toBe(0);
	});
});

describe("parseLog", () => {
	it("lit les lignes du tableau Log, sans en-tête ni séparateur", () => {
		expect(parseLog(note)).toEqual([{ date: "20/10", seance: "A", exercice: "Tractions", charge: "0", reps: "10" }]);
	});
	it("rend une liste vide sans section Log", () => {
		expect(parseLog("## A — X\n| a | b |\n|---|---|\n| c | d |")).toEqual([]);
	});
});

describe("addLogRow", () => {
	const ligne = { date: "22/10/2026", seance: "C", exercice: "Développé couché", charge: "62,5", reps: "8" };
	it("ajoute la ligne sous la dernière du tableau, sans toucher au reste", () => {
		const out = addLogRow(note, ligne);
		expect(out).toContain("| 20/10 | A | Tractions | 0 | 10 |\n| 22/10/2026 | C | Développé couché | 62,5 | 8 |\n\n## Repères");
		expect(parseLog(out)).toHaveLength(2);
	});
	it("crée l'en-tête si la section est vide, la section si elle manque", () => {
		expect(parseLog(addLogRow("## Log\n\n## Repères", ligne))).toEqual([ligne]);
		expect(parseLog(addLogRow("# Programme", ligne))).toEqual([ligne]);
	});
	it("neutralise une barre verticale saisie, qui casserait le tableau", () => {
		expect(parseLog(addLogRow("## Log", { ...ligne, charge: "60|62" }))[0].charge).toBe("60/62");
	});
});

describe("enHaut", () => {
	it("compare les reps au haut de la fourchette", () => {
		expect(enHaut("4 × 6-8", "8")).toBe(true);
		expect(enHaut("4 × 6-8", "7")).toBe(false);
		expect(enHaut("3 × 5", "5")).toBe(true);
		expect(enHaut("6 × 10-15 s", "15")).toBe(false);
		expect(enHaut("4 × 6-8", "")).toBe(false);
	});
});

describe("resume", () => {
	it("dit la charge et les reps, ou ce qu'il en reste", () => {
		const l = { date: "", seance: "", exercice: "", charge: "62,5", reps: "8" };
		expect(resume(l)).toBe("62,5 kg × 8");
		expect(resume({ ...l, reps: "" })).toBe("62,5 kg");
		expect(resume({ ...l, charge: "" })).toBe("8 reps");
		expect(resume({ ...l, charge: "", reps: "" })).toBe("");
	});
});
