import { describe, expect, it } from "vitest";
import { parseProgramme, prochaineSeance } from "../src/entrainement";

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
	it("lit chaque séance, son jour, son lieu et ses exercices, sans l'en-tête du tableau", () => {
		expect(p.seances).toEqual([
			{ lettre: "A", nom: "Haut lourd", jour: "lundi", lieu: "salle", exercices: [{ nom: "Développé militaire debout", volume: "4 × 5-6" }, { nom: "Tractions", volume: "4 × 6-8" }] },
			{ lettre: "B", nom: "Terrain", jour: "mercredi", lieu: "terrain", exercices: [{ nom: "Sprints en côte", volume: "6 × 10-15 s" }] },
			{ lettre: "C", nom: "Haut volume", jour: "vendredi", lieu: "salle", exercices: [{ nom: "Développé couché", volume: "4 × 6-8" }] },
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
	const jour = (d: string) => new Date(`${d}T12:00:00`);
	it("prend la séance du jour, sinon la suivante, en bouclant sur la semaine", () => {
		expect(prochaineSeance(seances, jour("2026-10-19"))).toBe(0); // lundi
		expect(prochaineSeance(seances, jour("2026-10-22"))).toBe(2); // jeudi → vendredi
		expect(prochaineSeance(seances, jour("2026-10-24"))).toBe(0); // samedi → lundi
	});
	it("ouvre sur la première quand aucune séance n'a de jour", () => {
		expect(prochaineSeance([{ lettre: "A", nom: "X", exercices: [] }], jour("2026-10-22"))).toBe(0);
	});
});
