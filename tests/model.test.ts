import { describe, expect, it } from "vitest";
import { buildHome, shouldRefresh, splitEmoji, type Node, type Settings } from "../src/model";

// Arbres fictifs : aucun test ne lit le vault.
const note = (path: string): Node => ({ name: path.split("/").pop()!.replace(/\.(md|canvas)$/, ""), path, kind: path.endsWith(".canvas") ? "canvas" : "note" });
const dir = (path: string, children: Node[] = [], etat?: string): Node => ({ name: path.split("/").pop()!, path, kind: "folder", children, etat });
const etat = (action: string) => `---\nzone: x\n---\n# X\n## Prochaine action\n${action}\n## Tranché\n`;
const NONE: Settings = { accroches: {}, images: {}, quotidien: null, masques: [] };

const vault = (): Node =>
	dir("", [
		dir("_Socle", [note("_Socle/Portrait.md")]),
		dir("_archives"),
		dir("SÉNAQUE 2025"),
		dir("0. INBOX", [dir("0. INBOX/JOURNAL"), dir("0. INBOX/SOUVENIRS"), note("0. INBOX/💎 Galets blancs.md"), note("0. INBOX/💡Boites à idées.md"), note("0. INBOX/Sites utiles 🔗.md")]),
		dir("1. LE MÉTIER", [
			dir("1. LE MÉTIER/2. Fellowship", [note("1. LE MÉTIER/2. Fellowship/Dev.md")], etat("**Avant la bascule (19/10)** : x\n**Battre** y")),
			dir("1. LE MÉTIER/1. Runes de Chêne", [
				dir("1. LE MÉTIER/1. Runes de Chêne/Explore", [dir("1. LE MÉTIER/1. Runes de Chêne/Explore/Profond", [], etat("**Trop profond**"))], etat("- **La refonte du Hub (12/10)** : x")),
				dir("1. LE MÉTIER/1. Runes de Chêne/Images"),
			], etat("**Le produit d'abord (08/10) : on ne relance pas**")),
			dir("1. LE MÉTIER/10. Dixième"),
			dir("1. LE MÉTIER/Brouillon"),
		]),
		dir("2. LA HOUSSAYE", [
			note("2. LA HOUSSAYE/💠 Mon Scénario.md"),
			dir("2. LA HOUSSAYE/JCE"),
			dir("2. LA HOUSSAYE/Immobilier"),
			note("2. LA HOUSSAYE/_brouillon.md"),
			note("2. LA HOUSSAYE/Carte.canvas"),
		]),
		dir("3. L'ATELIER", [dir("3. L'ATELIER/Griffon")]),
		dir("4. L'ŒUVRE"),
		dir("3.ATELIER BIS"),
	]);

describe("buildHome — Le Métier", () => {
	it("prend les sous-dossiers numérotés de 1. LE MÉTIER, triés numériquement", () => {
		const home = buildHome(vault(), NONE);
		expect(home.metiers.map((m) => [m.numero, m.romain, m.titre])).toEqual([
			[1, "I", "Runes de Chêne"],
			[2, "II", "Fellowship"],
			[10, "X", "Dixième"],
		]);
	});
	it("lit la prochaine action et le compte des autres", () => {
		const [rdc, fel, dix] = buildHome(vault(), NONE).metiers;
		expect(rdc.action).toEqual({ text: "Le produit d'abord", more: 0 });
		expect(fel.action).toEqual({ text: "Avant la bascule", more: 1 });
		expect(dix.action).toBeUndefined();
	});
	it("ajoute le sous-projet le plus proche, pas plus profond", () => {
		const [rdc, fel] = buildHome(vault(), NONE).metiers;
		expect(rdc.sousProjets).toEqual([{ titre: "Explore", text: "La refonte du Hub" }]);
		expect(rdc.sousProjetsEnPlus).toBe(0);
		expect(fel.sousProjets).toEqual([]);
	});
	it("garde deux sous-projets au plus, par ordre alphabétique", () => {
		const subs = ["C", "A", "B"].map((n) => dir(`1. LE MÉTIER/1. P/${n}`, [], etat(`**${n}**`)));
		const root = dir("", [dir("1. LE MÉTIER", [dir("1. LE MÉTIER/1. P", subs)])]);
		const [p] = buildHome(root, NONE).metiers;
		expect(p.sousProjets.map((s) => s.titre)).toEqual(["A", "B"]);
		expect(p.sousProjetsEnPlus).toBe(1);
	});
	it("donne une section vide sans 1. LE MÉTIER", () => {
		expect(buildHome(dir("", [dir("2. X")]), NONE).metiers).toEqual([]);
	});
	it("lit l'accroche dans les réglages", () => {
		const home = buildHome(vault(), { ...NONE, accroches: { "1. LE MÉTIER/2. Fellowship": "L'application" } });
		expect(home.metiers[1].accroche).toBe("L'application");
		expect(home.metiers[0].accroche).toBeUndefined();
	});
});

describe("buildHome — Les Domaines", () => {
	it("prend les dossiers racine numérotés sauf 0 et 1", () => {
		const home = buildHome(vault(), NONE);
		expect(home.domaines.map((d) => [d.numero, d.titre])).toEqual([
			["02", "La Houssaye"],
			["03", "L'Atelier"],
			["03", "Atelier Bis"],
			["04", "L'Œuvre"],
		]);
	});
	it("liste dossiers puis notes, alphabétique sans l'emoji, rien qui commence par _", () => {
		const [houssaye] = buildHome(vault(), NONE).domaines;
		expect(houssaye.liens.map((l) => [l.label, l.kind])).toEqual([
			["Immobilier", "folder"],
			["JCE", "folder"],
			["Carte", "canvas"],
			["💠 Mon Scénario", "note"],
		]);
	});
	it("plafonne à 12 liens", () => {
		const notes = Array.from({ length: 15 }, (_, i) => note(`2. X/n${String(i).padStart(2, "0")}.md`));
		const [x] = buildHome(dir("", [dir("2. X", notes)]), NONE).domaines;
		expect(x.liens).toHaveLength(12);
		expect(x.enPlus).toBe(3);
	});
	it("cache les dossiers masqués et le dossier du quotidien", () => {
		const home = buildHome(vault(), { ...NONE, masques: ["2. LA HOUSSAYE/JCE"], quotidien: "2. LA HOUSSAYE/Immobilier" });
		expect(home.domaines[0].liens.map((l) => l.label)).toEqual(["Carte", "💠 Mon Scénario"]);
	});
	it("masque aussi un domaine entier", () => {
		const home = buildHome(vault(), { ...NONE, masques: ["4. L'ŒUVRE"] });
		expect(home.domaines.map((d) => d.titre)).not.toContain("L'Œuvre");
	});
});

describe("buildHome — Au quotidien", () => {
	it("est absent sans dossier choisi, ou si le dossier n'existe plus", () => {
		expect(buildHome(vault(), NONE).quotidien).toBeNull();
		expect(buildHome(vault(), { ...NONE, quotidien: "Disparu" }).quotidien).toBeNull();
	});
	it("donne les sous-dossiers non masqués et les notes directes avec leur emoji", () => {
		const q = buildHome(vault(), { ...NONE, quotidien: "0. INBOX", masques: ["0. INBOX/SOUVENIRS"] }).quotidien!;
		expect(q.dossiers.map((d) => d.label)).toEqual(["JOURNAL"]);
		expect(q.notes).toEqual([
			{ emoji: "💡", label: "Boites à idées", path: "0. INBOX/💡Boites à idées.md" },
			{ emoji: "💎", label: "Galets blancs", path: "0. INBOX/💎 Galets blancs.md" },
			{ label: "Sites utiles 🔗", path: "0. INBOX/Sites utiles 🔗.md" },
		]);
	});
});

describe("splitEmoji", () => {
	it("sépare l'emoji de tête, avec ou sans espace", () => {
		expect(splitEmoji("💎 Galets blancs")).toEqual({ emoji: "💎", label: "Galets blancs" });
		expect(splitEmoji("💡Boites à idées")).toEqual({ emoji: "💡", label: "Boites à idées" });
		expect(splitEmoji("🗒️ Notes diverses")).toEqual({ emoji: "🗒️", label: "Notes diverses" });
	});
	it("laisse un nom sans emoji de tête intact", () => {
		expect(splitEmoji("Sites utiles 🔗")).toEqual({ label: "Sites utiles 🔗" });
	});
});

describe("buildHome — sous-projets archivés", () => {
	it("ignore les dossiers qui commencent par _", () => {
		const root = dir("", [dir("1. LE MÉTIER", [dir("1. LE MÉTIER/1. P", [dir("1. LE MÉTIER/1. P/_archives", [dir("1. LE MÉTIER/1. P/_archives/Vieux", [], etat("**Mort**"))])])])]);
		expect(buildHome(root, NONE).metiers[0].sousProjets).toEqual([]);
	});
});

describe("shouldRefresh", () => {
	it("ne recalcule sur modification que pour un _État.md", () => {
		expect(shouldRefresh("modify", "a/Note.md")).toBe(false);
		expect(shouldRefresh("modify", "a/_État.md")).toBe(true);
		expect(shouldRefresh("rename", "a/Note.md")).toBe(true);
		expect(shouldRefresh("create", "a/Note.md")).toBe(true);
	});
});

describe("buildHome — images de fond", () => {
	it("lit l'image dans les réglages, pour un métier comme pour un domaine", () => {
		const home = buildHome(vault(), { ...NONE, images: { "1. LE MÉTIER/1. Runes de Chêne": "img/rdc.jpg", "2. LA HOUSSAYE": "img/maison.png" } });
		expect(home.metiers[0].image).toBe("img/rdc.jpg");
		expect(home.metiers[1].image).toBeUndefined();
		expect(home.domaines[0].image).toBe("img/maison.png");
	});
});
