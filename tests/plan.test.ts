import { describe, expect, it } from "vitest";
import { aujourdhui, basculer, chiffre, dateCourte, estPlan, fenetre, moisDe, parsePlan, position, positionFin, projetDe } from "../src/plan";

const note = [
	"---",
	"type: plan",
	"debut: 2026-11-01",
	"fin: 2027-04-30",
	"---",
	"# Plan",
	"## Objectifs",
	"- [ ] Ventes en ligne par mois : 40 📅 2027-04-30",
	"- [ ] Scans du QR : objectif à fixer",
	"Les chiffres atteints se lisent dans le Hub.",
	"## Jalons",
	"### Novembre",
	"- [ ] Le dépliant arrive #jalon 📅 2026-11-06",
	"- [x] Revoir `/flyer` 📅 2026-11-05",
	"- [ ] Démarcher les musées 🛫 2027-01-15 📅 2027-03-15",
	"- [ ] Sans date",
	"\t- [ ] Sous-tâche ignorée 📅 2026-11-08",
	"## Notes",
	"- [ ] Pas un jalon 📅 2026-12-01",
].join("\n");

describe("estPlan", () => {
	it("reconnaît `type: plan` dans l'en-tête seulement", () => {
		expect(estPlan(note)).toBe(true);
		expect(estPlan("---\ntype: etat\n---\ntype: plan")).toBe(false);
		expect(estPlan("type: plan")).toBe(false);
	});
});

describe("parsePlan", () => {
	const p = parsePlan(note, "1. LE MÉTIER/1. Runes de Chêne/Plan.md");
	it("lit le projet et la fenêtre de l'en-tête", () => {
		expect([p.projet, p.debut, p.fin]).toEqual(["Runes de Chêne", "2026-11-01", "2027-04-30"]);
	});
	it("lit les objectifs : nom, cible, échéance", () => {
		expect(p.objectifs.map((o) => [o.nom, o.cible, o.echeance])).toEqual([
			["Ventes en ligne par mois", "40", "2027-04-30"],
			["Scans du QR", "objectif à fixer", undefined],
		]);
	});
	it("lit les jalons de la section, sans les sous-listes ni les autres sections", () => {
		expect(p.jalons.map((j) => j.texte)).toEqual(["Le dépliant arrive", "Revoir `/flyer`", "Démarcher les musées", "Sans date"]);
	});
	it("lit dates, étiquette, état et numéro de ligne", () => {
		expect(p.jalons[0]).toMatchObject({ jalon: true, echeance: "2026-11-06", fait: false, ligne: 12 });
		expect(p.jalons[1]).toMatchObject({ jalon: false, fait: true });
		expect(p.jalons[2]).toMatchObject({ debut: "2027-01-15", echeance: "2027-03-15" });
	});
	it("accepte les fins de ligne Windows", () => {
		expect(parsePlan(note.replace(/\n/g, "\r\n"), "Plan.md").jalons[0].texte).toBe("Le dépliant arrive");
	});
});

describe("basculer", () => {
	it("coche puis décoche la ligne, sans toucher au reste", () => {
		const cochee = basculer(note, 12, "Le dépliant arrive");
		expect(cochee.split("\n")[12]).toBe("- [x] Le dépliant arrive #jalon 📅 2026-11-06");
		expect(basculer(cochee, 12, "Le dépliant arrive")).toBe(note);
	});
	it("ne touche à rien si la ligne a changé de texte", () => {
		expect(basculer(note, 12, "Autre chose")).toBe(note);
		expect(basculer(note, 999, "Le dépliant arrive")).toBe(note);
	});
});

describe("la frise", () => {
	const f = { debut: "2026-11-01", fin: "2027-04-30" };
	it("prend la fenêtre du plan, sinon celle des dates, en mois entiers", () => {
		expect(fenetre([parsePlan(note, "Plan.md")])).toEqual(f);
		expect(fenetre([{ path: "", projet: "", objectifs: [], jalons: [{ texte: "", ligne: 0, fait: false, jalon: false, echeance: "2026-12-10" }] }])).toEqual({ debut: "2026-12-01", fin: "2026-12-31" });
		expect(fenetre([])).toBeNull();
	});
	it("place les dates de 0 à 1, bornées", () => {
		expect(position("2026-11-01", f)).toBe(0);
		expect(positionFin("2027-04-30", f)).toBe(1);
		expect(position("2026-10-01", f)).toBe(0);
		expect(position("2027-06-01", f)).toBe(1);
	});
	it("découpe six mois qui couvrent toute la frise", () => {
		const m = moisDe(f);
		expect(m.map((x) => x.nom)).toEqual(["nov.", "déc.", "janv.", "févr.", "mars", "avr."]);
		expect(m[0].debut).toBe(0);
		expect(m[5].fin).toBe(1);
		expect(m[1].debut).toBeCloseTo(m[0].fin);
	});
	it("écrit les dates courtes et le jour", () => {
		expect(dateCourte("2026-11-15")).toBe("15 nov.");
		expect(aujourdhui(new Date(2026, 9, 31, 23, 30))).toBe("2026-10-31");
	});
	it("tire le projet du dossier de la note", () => {
		expect(projetDe("2. Fellowship/Plan.md")).toBe("Fellowship");
		expect(projetDe("Plan.md")).toBe("Vault");
	});
});

describe("chiffre", () => {
	it("sépare le chiffre de son unité", () => {
		expect(chiffre("50 par week-end")).toEqual({ valeur: "50", unite: "par week-end" });
		expect(chiffre("30 %")).toEqual({ valeur: "30 %", unite: undefined });
		expect(chiffre("12 000 € de CA")).toEqual({ valeur: "12 000 €", unite: "de CA" });
		expect(chiffre("à fixer")).toEqual({ valeur: "à fixer" });
	});
});
