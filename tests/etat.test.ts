import { describe, expect, it } from "vitest";
import { extractNextAction } from "../src/etat";

describe("extractNextAction", () => {
	it("prend le premier gras de la section, jusqu'au ## suivant", () => {
		expect(extractNextAction("## Prochaine action\n\n**Définir le catalogue** — quels livres.\n\n## Tranché\n**Autre**"))
			.toEqual({ text: "Définir le catalogue", more: 0 });
	});
	it("ignore le frontmatter et ce qui précède", () => {
		expect(extractNextAction("---\nzone: x\n---\n\n# X\n## Où on en est\n**Pas ça**\n## Prochaine action\n**Ça**"))
			.toEqual({ text: "Ça", more: 0 });
	});
	it("coupe avant la première parenthèse ou deux-points", () => {
		expect(extractNextAction("## Prochaine action\n**Le produit d'abord (08/10, Uriel : « x ») : on ne relance pas**"))
			.toEqual({ text: "Le produit d'abord", more: 0 });
	});
	it("compte les autres paragraphes qui commencent par du gras", () => {
		expect(extractNextAction("## Prochaine action\n**Avant la bascule de la V2 à la racine, dans cet ordre (19/10)** : 1.\n**Battre** x\n\n**Distribuer.** y\ntexte"))
			.toEqual({ text: "Avant la bascule de la V2 à la racine, dans cet ordre", more: 2 });
	});
	it("accepte les paragraphes en liste", () => {
		expect(extractNextAction("## Prochaine action\n- **La refonte du Hub (lancée le 12/10)** : le Hub…\n- **J'y suis allé** x"))
			.toEqual({ text: "La refonte du Hub", more: 1 });
	});
	it("sans gras, prend la première ligne non vide", () => {
		expect(extractNextAction("## Prochaine action\n\nAppeler le notaire.\n")).toEqual({ text: "Appeler le notaire.", more: 0 });
	});
	it("retire la ponctuation finale laissée par la coupe", () => {
		expect(extractNextAction("## Prochaine action\n**Distribuer.** Le produit")).toEqual({ text: "Distribuer", more: 0 });
	});
	it("renvoie null sans section ou avec une section vide", () => {
		expect(extractNextAction("# X\n## Où on en est\nbla")).toBeNull();
		expect(extractNextAction("## Prochaine action\n\n## Tranché\n")).toBeNull();
	});
	it("tolère les fins de ligne Windows", () => {
		expect(extractNextAction("## Prochaine action\r\n\r\n**Définir le catalogue**\r\n")).toEqual({ text: "Définir le catalogue", more: 0 });
	});
});

describe("extractNextAction — titre de section", () => {
	it("accepte une capitale et un suffixe après le titre", () => {
		expect(extractNextAction("## Prochaine Action\n**Ça**")).toEqual({ text: "Ça", more: 0 });
		expect(extractNextAction("## Prochaine action ⏭\n**Ça**")).toEqual({ text: "Ça", more: 0 });
	});
});
