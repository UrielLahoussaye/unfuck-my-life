import { describe, expect, it } from "vitest";
import { addToCanvas, parseVision } from "../src/vision";

const canvas = (nodes: object[]) => JSON.stringify({ nodes, edges: [] });

describe("parseVision", () => {
	it("garde images et textes, dans l'ordre de lecture", () => {
		const json = canvas([
			{ id: "1", type: "text", text: "  Bas  ", x: 0, y: 500, width: 10, height: 10 },
			{ id: "2", type: "file", file: "img/b.JPG", x: 300, y: 0, width: 10, height: 10 },
			{ id: "3", type: "file", file: "img/a.png", x: 0, y: 0, width: 10, height: 10 },
			{ id: "4", type: "file", file: "Note.md", x: 0, y: 100, width: 10, height: 10 },
			{ id: "5", type: "group", x: 0, y: 200, width: 10, height: 10 },
			{ id: "6", type: "text", text: "   ", x: 0, y: 300, width: 10, height: 10 },
		]);
		expect(parseVision(json)).toEqual([
			{ kind: "image", path: "img/a.png" },
			{ kind: "image", path: "img/b.JPG" },
			{ kind: "text", text: "Bas" },
		]);
	});
	it("un canvas vide ou neuf ne montre rien", () => {
		expect(parseVision("")).toEqual([]);
		expect(parseVision("{}")).toEqual([]);
	});
});

describe("addToCanvas", () => {
	it("pose le nouvel élément sous le plus bas, sans toucher au reste", () => {
		const json = JSON.stringify({ nodes: [{ id: "1", type: "text", text: "A", x: 50, y: 100, width: 400, height: 200 }], edges: [{ id: "e" }] });
		const out = JSON.parse(addToCanvas(json, { kind: "image", path: "img/c.png" }));
		expect(out.edges).toEqual([{ id: "e" }]);
		expect(out.nodes[0].text).toBe("A");
		expect(out.nodes[1]).toMatchObject({ type: "file", file: "img/c.png", x: 0, y: 340 });
	});
	it("crée le contenu d'un canvas vide", () => {
		const out = JSON.parse(addToCanvas("", { kind: "text", text: "Fellowship à 500 € par mois." }));
		expect(out.nodes).toHaveLength(1);
		expect(out.nodes[0]).toMatchObject({ type: "text", text: "Fellowship à 500 € par mois.", y: 0 });
		expect(parseVision(JSON.stringify(out))).toEqual([{ kind: "text", text: "Fellowship à 500 € par mois." }]);
	});
});
