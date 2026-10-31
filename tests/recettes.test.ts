import { describe, expect, it, vi } from "vitest";
vi.mock("obsidian", () => ({ requestUrl: vi.fn() }));
import { requestUrl } from "obsidian";
import { ajouterRecettes } from "../src/recettes";
import { interroger, type Connecteur } from "../src/connecteurs";

// Produits par le chiffrement de Fellowship (apps/web-v2/src/lib/cipher.ts, createKey + sealRevenue) :
// si l'un des deux côtés change d'algorithme, ces constantes cassent le test.
const PHRASE = "chêne lune forge rivière";
const CLE = { salt: "Fbo5JwDxjHVFWdLk/o3v2A==", iterations: 600000 };
const CARTE_2830_ESPECES_1380 = "4v++VBmFV33WmXLMUvcLyJgItlCbD+J8PFfDMJxGKhSZto4x7Pal/JHtmkNgGcTw6XOHPAE7NMkk2HeLuPfIFrW7Fsjs9HJXGJ+ANlM=";
const CARTE_100_5_ESPECES_0 = "eecWukzIUlbkcyOKLiTdRfqyyXQHwbqMBiVjcwPAQwdrUlr6SKW0BA9RXYKbpGKegPfSFTnvSDpf0cLQIU9o9z+ruSvcv7FIaJLl0/8=";

const reponse = {
	ca: 1000,
	ca_reel: 500,
	cle: CLE,
	secrets: [
		{ payload: CARTE_2830_ESPECES_1380, dans_ca: true },
		{ payload: CARTE_100_5_ESPECES_0, dans_ca: false },
	],
};

describe("ajouterRecettes", () => {
	it("déchiffre ce que Fellowship a chiffré : ca_reel toujours, ca seulement si dans_ca", async () => {
		const r = await ajouterRecettes(reponse, PHRASE);
		expect(r.ca_reel).toBe(500 + 2830 + 1380 + 100.5);
		expect(r.ca).toBe(1000 + 2830 + 1380);
	});
	it("ne touche pas la réponse d'origine", async () => {
		await ajouterRecettes(reponse, PHRASE);
		expect(reponse.ca).toBe(1000);
	});
	it("la phrase est normalisée comme côté Fellowship (NFD, espace final)", async () => {
		const r = await ajouterRecettes(reponse, PHRASE.normalize("NFD") + " ");
		expect(r.ca_reel).toBe(4810.5);
	});
	it("une mauvaise phrase se dit", async () => {
		await expect(ajouterRecettes(reponse, "une autre phrase de passe")).rejects.toThrow("phrase des recettes incorrecte");
	});
});

describe("connecteur JSON", () => {
	const c: Connecteur = { id: "fellowship", type: "json", secret: "cle", url: "https://x", mesures: "ca = ca\nca_reel = ca_reel", secretPhrase: "phrase" };
	const app = (coffre: Record<string, string>) => ({ secretStorage: { getSecret: (n: string) => coffre[n] ?? null } }) as never;
	const f = { debut: "2026-11-01", fin: "2026-11-30" };

	it("ajoute les recettes déchiffrées aux mesures", async () => {
		vi.mocked(requestUrl).mockResolvedValue({ status: 200, json: reponse } as never);
		expect(await interroger(app({ cle: "k", phrase: PHRASE }), c, f)).toEqual({ ca: 5210, ca_reel: 4810.5 });
	});
	it("phrase absente du coffre : erreur lisible", async () => {
		vi.mocked(requestUrl).mockResolvedValue({ status: 200, json: reponse } as never);
		await expect(interroger(app({ cle: "k" }), c, f)).rejects.toThrow("fellowship : phrase des recettes absente du coffre");
	});
	it("sans cle ni secrets, la réponse reste telle quelle (sans phrase requise)", async () => {
		vi.mocked(requestUrl).mockResolvedValue({ status: 200, json: { ca: 10, ca_reel: 5, cle: null, secrets: [] } } as never);
		expect(await interroger(app({ cle: "k" }), c, f)).toEqual({ ca: 10, ca_reel: 5 });
	});
});
