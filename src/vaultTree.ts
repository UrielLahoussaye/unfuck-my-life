import { TFile, TFolder, type App, type TAbstractFile } from "obsidian";
import type { Node } from "./model";

const ETAT = "_État.md";

/** Réduit le vault à l'arbre que lit buildHome. Ne descend pas dans les dossiers masqués. */
export async function toTree(app: App, masques: string[]): Promise<Node> {
	const masked = (path: string) => masques.some((m) => path === m || path.startsWith(m + "/"));

	const walk = async (f: TAbstractFile): Promise<Node | null> => {
		if (f instanceof TFolder) {
			const node: Node = { name: f.name, path: f.path, kind: "folder", children: [] };
			if (f.path !== "/" && masked(f.path)) return node;
			const etat = f.children.find((c): c is TFile => c instanceof TFile && c.name === ETAT);
			if (etat) node.etat = await app.vault.cachedRead(etat);
			const children = await Promise.all(f.children.map(walk));
			node.children = children.filter((c): c is Node => !!c);
			return node;
		}
		if (f instanceof TFile && (f.extension === "md" || f.extension === "canvas")) {
			return { name: f.basename, path: f.path, kind: f.extension === "md" ? "note" : "canvas" };
		}
		return null;
	};

	const root = (await walk(app.vault.getRoot()))!;
	root.path = "";
	return root;
}
