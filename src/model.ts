import { extractNextAction, type NextAction } from "./etat";

/** Arbre du vault, réduit à ce que l'accueil lit. */
export interface Node {
	name: string;
	path: string;
	kind: "folder" | "note" | "canvas";
	children?: Node[];
	/** Contenu du _État.md posé directement dans ce dossier. */
	etat?: string;
}

export interface Settings {
	/** Accroche par chemin de dossier. */
	accroches: Record<string, string>;
	/** Dossier dont les notes forment « Au quotidien ». */
	quotidien: string | null;
	/** Dossiers jamais affichés, avec tout ce qu'ils contiennent. */
	masques: string[];
}

export interface Link {
	label: string;
	path: string;
	kind: Node["kind"];
}

export interface Metier {
	numero: number;
	romain: string;
	titre: string;
	accroche?: string;
	path: string;
	action?: NextAction;
	sousProjets: { titre: string; text: string }[];
	sousProjetsEnPlus: number;
}

export interface Domaine {
	numero: string;
	titre: string;
	accroche?: string;
	path: string;
	liens: Link[];
	enPlus: number;
}

export interface Quotidien {
	dossiers: Link[];
	notes: { emoji?: string; label: string; path: string }[];
}

export interface HomeModel {
	metiers: Metier[];
	domaines: Domaine[];
	quotidien: Quotidien | null;
}

const METIER_ROOT = 1;
const CAPTURE = 0;
const MAX_LIENS = 12;
const MAX_SOUS_PROJETS = 2;

export function buildHome(root: Node, settings: Settings): HomeModel {
	const hidden = (path: string) =>
		[...settings.masques, settings.quotidien ?? ""].some((m) => m && (path === m || path.startsWith(m + "/")));
	const accroche = (path: string) => settings.accroches[path]?.trim() || undefined;
	const numbered = numberedChildren(root);

	const metierRoot = numbered.find((n) => n.num === METIER_ROOT);
	const metiers = metierRoot ? numberedChildren(metierRoot.node).filter((n) => !hidden(n.node.path)) : [];

	return {
		metiers: metiers.map(({ num, rest, node }) => {
			const action = node.etat ? extractNextAction(node.etat) ?? undefined : undefined;
			const subs = nearestEtats(node)
				.map((s) => ({ titre: s.name, action: extractNextAction(s.etat!) }))
				.filter((s): s is { titre: string; action: NextAction } => !!s.action)
				.sort((a, b) => compare(a.titre, b.titre));
			return {
				numero: num,
				romain: roman(num),
				titre: rest,
				accroche: accroche(node.path),
				path: node.path,
				action,
				sousProjets: subs.slice(0, MAX_SOUS_PROJETS).map((s) => ({ titre: s.titre, text: s.action.text })),
				sousProjetsEnPlus: Math.max(subs.length - MAX_SOUS_PROJETS, 0),
			};
		}),
		domaines: numbered
			.filter((n) => n.num !== CAPTURE && n.num !== METIER_ROOT && !hidden(n.node.path))
			.map(({ num, rest, node }) => {
				const liens = links(node, hidden);
				return {
					numero: String(num).padStart(2, "0"),
					titre: titleCase(rest),
					accroche: accroche(node.path),
					path: node.path,
					liens: liens.slice(0, MAX_LIENS),
					enPlus: Math.max(liens.length - MAX_LIENS, 0),
				};
			}),
		quotidien: quotidien(root, settings, hidden),
	};
}

function quotidien(root: Node, settings: Settings, hidden: (p: string) => boolean): Quotidien | null {
	if (!settings.quotidien) return null;
	const folder = find(root, settings.quotidien);
	if (!folder || folder.kind !== "folder") return null;
	const visible = (folder.children ?? []).filter((c) => !c.name.startsWith("_") && !c.name.startsWith(".") && !settings.masques.some((m) => c.path === m || c.path.startsWith(m + "/")));
	return {
		dossiers: sortLinks(visible.filter((c) => c.kind === "folder")).map(toLink),
		notes: sortLinks(visible.filter((c) => c.kind !== "folder")).map((n) => ({ ...splitEmoji(n.name), path: n.path })),
	};
}

/** Enfants directs affichables d'un domaine : dossiers puis notes. */
function links(node: Node, hidden: (p: string) => boolean): Link[] {
	const visible = (node.children ?? []).filter((c) => !c.name.startsWith("_") && !c.name.startsWith(".") && !hidden(c.path));
	return [...sortLinks(visible.filter((c) => c.kind === "folder")), ...sortLinks(visible.filter((c) => c.kind !== "folder"))].map(toLink);
}

/** Les _État.md les plus proches sous ce dossier, sans descendre sous un dossier qui en a un. */
function nearestEtats(node: Node): Node[] {
	return (node.children ?? [])
		.filter((c) => c.kind === "folder")
		.flatMap((c) => (c.etat ? [c] : nearestEtats(c)));
}

function numberedChildren(node: Node): { num: number; rest: string; node: Node }[] {
	return (node.children ?? [])
		.filter((c) => c.kind === "folder")
		.flatMap((c) => {
			const m = c.name.match(/^(\d+)\.\s*(.+)$/);
			return m ? [{ num: Number(m[1]), rest: m[2].trim(), node: c }] : [];
		})
		.sort((a, b) => a.num - b.num);
}

function find(node: Node, path: string): Node | undefined {
	if (node.path === path) return node;
	for (const c of node.children ?? []) {
		if (path === c.path || path.startsWith(c.path + "/")) return find(c, path);
	}
	return undefined;
}

const toLink = (n: Node): Link => ({ label: n.name, path: n.path, kind: n.kind });
const sortLinks = (nodes: Node[]) => [...nodes].sort((a, b) => compare(splitEmoji(a.name).label, splitEmoji(b.name).label));
const compare = (a: string, b: string) => a.localeCompare(b, "fr", { sensitivity: "base" });

const EMOJI_HEAD = /^((?:\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*)+)\s*(.*)$/u;

export function splitEmoji(name: string): { emoji?: string; label: string } {
	const m = name.match(EMOJI_HEAD);
	return m ? { emoji: m[1], label: m[2] } : { label: name };
}

/** « LA HOUSSAYE » → « La Houssaye », « L'ATELIER » → « L'Atelier ». */
function titleCase(s: string): string {
	return s.toLocaleLowerCase("fr").replace(/(^|[\s'’-])(\p{L})/gu, (_, sep: string, c: string) => sep + c.toLocaleUpperCase("fr"));
}

function roman(n: number): string {
	const table: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
	let out = "";
	for (const [v, s] of table) while (n >= v) { out += s; n -= v; }
	return out;
}
