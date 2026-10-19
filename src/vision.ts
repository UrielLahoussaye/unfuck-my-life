/** Ce que le tableau de vision montre d'un canvas : ses images et ses textes, dans l'ordre de lecture. */
export type VisionItem = { kind: "image"; path: string } | { kind: "text"; text: string };

const IMAGE = /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i;

interface CanvasNode {
	id: string;
	type: string;
	x: number;
	y: number;
	width: number;
	height: number;
	file?: string;
	text?: string;
}

function nodes(json: string): CanvasNode[] {
	if (!json.trim()) return [];
	const data = JSON.parse(json);
	return Array.isArray(data?.nodes) ? data.nodes : [];
}

/** De haut en bas, puis de gauche à droite ; les notes, liens et groupes sont ignorés. */
export function parseVision(json: string): VisionItem[] {
	return nodes(json)
		.slice()
		.sort((a, b) => a.y - b.y || a.x - b.x)
		.flatMap((n): VisionItem[] => {
			if (n.type === "file" && n.file && IMAGE.test(n.file)) return [{ kind: "image", path: n.file }];
			if (n.type === "text" && n.text?.trim()) return [{ kind: "text", text: n.text.trim() }];
			return [];
		});
}

/** Ajoute une image ou un texte sous tout ce que le canvas contient déjà. */
export function addToCanvas(json: string, item: VisionItem): string {
	const data = json.trim() ? JSON.parse(json) : {};
	const list: CanvasNode[] = Array.isArray(data.nodes) ? data.nodes : [];
	const y = list.reduce((max, n) => Math.max(max, n.y + n.height), -40) + 40;
	const base = { id: Math.random().toString(16).slice(2, 18), x: 0, y };
	list.push(item.kind === "image" ? { ...base, type: "file", file: item.path, width: 400, height: 300 } : { ...base, type: "text", text: item.text, width: 400, height: 120 });
	return JSON.stringify({ ...data, nodes: list, edges: data.edges ?? [] }, null, "\t");
}
