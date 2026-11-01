import { describe, expect, it } from "vitest";
import { aujourdhui, basculer, bornes, chiffre, commeCible, dateCourte, moisDuNom, nombre, palier, periodeDe, estPlan, fenetre, moisDe, parsePlan, position, positionFin, projetDe, renommer, ecart } from "../src/plan";

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
		const cochee = basculer(note, 12, "Le dépliant arrive", "2026-11-01");
		expect(cochee.split("\n")[12]).toBe("- [x] Le dépliant arrive #jalon 📅 2026-11-06 ✅ 2026-11-01");
		expect(parsePlan(cochee, "p.md").jalons.find((j) => j.ligne === 12)).toMatchObject({ texte: "Le dépliant arrive", echeance: "2026-11-06", fait: true });
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

describe("objectifs mesurés et paliers", () => {
	const md = [
		"---", "type: plan", "debut: 2026-11-01", "fin: 2027-04-30", "---",
		"## Objectifs",
		"- [ ] CA par mois : 10 000 € 📅 2027-04-30 [mesure:: boutique.ca + fellowship.ca]",
		"- [ ] Ventes en ligne par mois : 30 📅 2027-04-30 [depart:: 15] [mesure:: boutique.commandes]",
		"\t- déc. : 40",
		"- [ ] Activations : 30 % [periode:: semaine] [mesure:: hub.activations / hub.ventes_stand]",
		"- [ ] Livre écrit : 1",
	].join("\n");
	const p = parsePlan(md, "1. X/Plan.md");
	const [ca, ventes, activ, livre] = p.objectifs;
	it("lit les champs inline et les retire du texte", () => {
		expect([ca.nom, ca.cible, ca.mesure]).toEqual(["CA par mois", "10 000 €", "boutique.ca + fellowship.ca"]);
		expect([ventes.depart, ventes.forces]).toEqual(["15", [{ mois: "déc.", valeur: "40" }]]);
		expect([activ.cible, activ.periode]).toEqual(["30 %", "semaine"]);
	});
	it("lit les nombres et les réécrit au format de la cible", () => {
		expect([nombre("10 000 €"), nombre("30 %"), nombre("50 par week-end"), nombre("à fixer")]).toEqual([10000, 30, 50, null]);
		expect([commeCible(6243, "10 000 €"), commeCible(22.4, "30 %"), commeCible(17.5, "30")]).toEqual(["6 243 €", "22 %", "18"]);
	});
	it("devine la période", () => {
		expect([periodeDe(ca), periodeDe(activ), periodeDe(livre)]).toEqual(["mois", "semaine", "plan"]);
		expect(periodeDe({ ...livre, nom: "Inscriptions au stand", cible: "50 par week-end" })).toBe("semaine");
	});
	it("donne les bornes de la période", () => {
		expect(bornes("mois", "2026-11-14", p)).toEqual({ debut: "2026-11-01", fin: "2026-11-30" });
		expect(bornes("semaine", "2026-11-14", p)).toEqual({ debut: "2026-11-08", fin: "2026-11-14" });
		expect(bornes("trimestre", "2026-11-14", p)).toEqual({ debut: "2026-08-17", fin: "2026-11-14" });
		expect(periodeDe({ ...livre, nom: "CA sur trois mois glissants" })).toBe("trimestre");
		expect(bornes("plan", "2026-11-14", p)).toEqual({ debut: "2026-11-01", fin: "2026-11-14" });
	});
	it("tient la cible chaque mois sans départ : la durabilité", () => {
		expect(palier(ca, p, "2026-11-14")).toEqual({ valeur: "10 000 €", mois: "novembre" });
		expect(palier(livre, p, "2026-11-14")).toEqual({ valeur: "1", mois: null });
	});
	it("monte du départ à la cible, un mois forcé gagne", () => {
		expect(palier(ventes, p, "2026-11-14")).toEqual({ valeur: "15", mois: "novembre" });
		expect(palier(ventes, p, "2026-12-02")).toEqual({ valeur: "40", mois: "décembre" });
		expect(palier(ventes, p, "2027-02-10")).toEqual({ valeur: "24", mois: "février" });
		expect(palier(ventes, p, "2027-04-01")?.valeur).toBe("30");
	});
	it("retrouve un mois par son nom dans la fenêtre", () => {
		expect([moisDuNom("Décembre", "2026-11", "2027-04"), moisDuNom("févr.", "2026-11", "2027-04"), moisDuNom("juin", "2026-11", "2027-04")]).toEqual(["2026-12", "2027-02", undefined]);
	});
});

describe("renommer", () => {
	it("change le connecteur dans les mesures, et nulle part ailleurs", () => {
		const md = "- [ ] fellowship.ca : 5 000 € [mesure:: boutique.ca + fellowship.ca] [depart:: fellowship.x]\n- [ ] B [mesure:: fellowship.a / fellowship.b]";
		expect(renommer(md, "fellowship", "stand")).toBe(
			"- [ ] fellowship.ca : 5 000 € [mesure:: boutique.ca + stand.ca] [depart:: fellowship.x]\n- [ ] B [mesure:: stand.a / stand.b]",
		);
	});
	it("ne touche pas un connecteur dont le nom finit pareil", () => {
		expect(renommer("[mesure:: superstand.ca + stand.ca]", "stand", "festivals")).toBe("[mesure:: superstand.ca + festivals.ca]");
	});
});

describe("ecart", () => {
	it("signé comme la flèche : ce qu'on a en plus, ou ce qui manque", () => {
		expect(ecart(6240, 5000)).toEqual({ texte: "+25 %", dessus: true });
		expect(ecart(5000, 5000)).toEqual({ texte: "+0 %", dessus: true });
		expect(ecart(11, 30)).toEqual({ texte: "−63 %", dessus: false });
		expect(ecart(3, 0)).toBeNull();
	});
});
