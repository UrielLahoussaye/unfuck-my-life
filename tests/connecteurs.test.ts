import { describe, expect, it, vi } from "vitest";
vi.mock("obsidian", () => ({ requestUrl: vi.fn() }));
import { evaluer, lireMesures, remplir, suivre, termes } from "../src/connecteurs";

describe("connecteurs", () => {
	it("lit les mesures d'un connecteur JSON", () => {
		expect(lireMesures("ca = data.ca\n\nscans=0.total\nmal formé")).toEqual([["ca", "data.ca"], ["scans", "0.total"]]);
	});
	it("remplace les dates dans l'adresse et le corps", () => {
		expect(remplir('{"debut":"{debut}","fin":"{fin}"}', { debut: "2026-11-01", fin: "2026-11-30" })).toBe('{"debut":"2026-11-01","fin":"2026-11-30"}');
	});
	it("suit un chemin, tableaux compris, et dit où ça casse", () => {
		expect(suivre({ data: [{ ca: "12.5" }] }, "data.0.ca")).toBe(12.5);
		expect(() => suivre({ data: {} }, "data.ca")).toThrow("« data.ca » introuvable");
		expect(() => suivre({ ca: "x" }, "ca")).toThrow("n'est pas un nombre");
	});
	it("additionne, puis divise", async () => {
		const v: Record<string, number> = { "b.ca": 6000, "f.ca": 240, "h.act": 22, "h.ventes": 100 };
		const lire = async (c: string, m: string) => v[`${c}.${m}`];
		expect(await evaluer("b.ca + f.ca", lire)).toBe(6240);
		expect(await evaluer("h.act / h.ventes", lire)).toBe(0.22);
		expect(await evaluer("b.ca / h.zero", async () => 0)).toBeNaN();
		await expect(evaluer("boutique", lire)).rejects.toThrow("connecteur.mesure");
	});
});

describe("termes", () => {
	it("une somme de sources se détaille", () => {
		expect(termes("boutique.ca + fellowship.ca")).toEqual([
			{ connecteur: "boutique", mesure: "ca" },
			{ connecteur: "fellowship", mesure: "ca" },
		]);
	});
	it("un seul terme ou une division : rien à détailler", () => {
		expect(termes("boutique.ca")).toEqual([]);
		expect(termes("h.act / h.ventes")).toEqual([]);
	});
});
