import { ItemView, TFile, TFolder, setIcon, type WorkspaceLeaf } from "obsidian";
import { buildHome, splitEmoji, type Domaine, type Link, type Metier, type Quotidien } from "./model";
import { toTree } from "./vaultTree";
import type AccueilPlugin from "./main";

export const VIEW_TYPE_ACCUEIL = "accueil-view";

export class AccueilView extends ItemView {
	constructor(leaf: WorkspaceLeaf, private plugin: AccueilPlugin) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE_ACCUEIL;
	}

	getDisplayText() {
		return "Accueil";
	}

	getIcon() {
		return "home";
	}

	async onOpen() {
		await this.render();
	}

	async render() {
		const settings = this.plugin.settings;
		const home = buildHome(await toTree(this.app, settings.masques), settings);
		const root = this.contentEl;
		const scroll = root.scrollTop;
		root.empty();
		root.addClass("accueil");

		this.header(root);
		let n = 0;
		if (home.metiers.length) this.metiers(this.section(root, ++n, "Le Métier", "ce qui doit rapporter"), home.metiers);
		if (home.domaines.length) this.domaines(this.section(root, ++n, "Les Domaines", "le foyer, l’atelier, l’œuvre"), home.domaines);
		if (home.quotidien) this.quotidien(this.section(root, ++n, "Au quotidien", "les notes de tous les jours"), home.quotidien);
		root.scrollTop = scroll;
	}

	private header(root: HTMLElement) {
		const head = root.createDiv("accueil-head");
		const left = head.createDiv();
		const date = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
		left.createDiv({ cls: "accueil-date", text: date.toLocaleUpperCase("fr") });
		const title = left.createEl("h1", { cls: "accueil-title", text: "Mon Cerveau" });
		title.createSpan({ cls: "accueil-red", text: "." });
		const search = head.createDiv("accueil-search");
		search.createSpan({ text: "Où veux-tu aller ?" });
		search.createSpan({ cls: "accueil-kbd", text: "Ctrl O" });
		search.addEventListener("click", () => (this.app as any).commands.executeCommandById("switcher:open"));
	}

	private section(root: HTMLElement, n: number, label: string, sub: string): HTMLElement {
		const s = root.createDiv("accueil-section");
		const h = s.createDiv("accueil-section-head");
		h.createSpan({ cls: "accueil-red accueil-caps", text: roman(n) });
		h.createSpan({ cls: "accueil-caps", text: label });
		h.createDiv("accueil-rule");
		h.createSpan({ cls: "accueil-muted", text: sub });
		return s;
	}

	private metiers(s: HTMLElement, metiers: Metier[]) {
		const bento = s.createDiv("accueil-bento");
		const [first, second, ...rest] = metiers;
		this.card(bento, first, "is-big");
		if (!second) return bento.addClass("is-single");
		const col = bento.createDiv("accueil-bento-col");
		this.card(col, second, "is-wide");
		if (rest.length) {
			const smalls = col.createDiv("accueil-smalls");
			rest.forEach((m) => this.card(smalls, m, "is-small"));
		}
	}

	private card(parent: HTMLElement, m: Metier, size: string) {
		const card = parent.createDiv(`accueil-card ${size}`);
		card.createDiv({ cls: "accueil-watermark", text: m.romain });
		const top = card.createDiv("accueil-card-top");
		top.createSpan({ cls: "accueil-red accueil-caps", text: m.romain });
		arrow(top);
		card.createDiv("accueil-grow");
		card.createDiv({ cls: "accueil-card-title", text: m.titre });
		if (m.accroche) card.createDiv({ cls: "accueil-accroche", text: m.accroche });
		if (m.action || m.sousProjets.length) {
			const act = card.createDiv("accueil-action");
			if (m.action) act.createDiv({ cls: "accueil-action-main", text: m.action.text + (m.action.more ? `  ·  +${m.action.more}` : "") });
			for (const sp of m.sousProjets) act.createDiv({ cls: "accueil-action-sub", text: `${sp.titre}  —  ${sp.text}` });
			if (m.sousProjetsEnPlus) act.createDiv({ cls: "accueil-action-sub", text: `+${m.sousProjetsEnPlus} sous-projets` });
		}
		card.addEventListener("click", () => {
			this.openPath(`${m.path}/_État.md`);
			this.reveal(m.path);
		});
	}

	private domaines(s: HTMLElement, domaines: Domaine[]) {
		const grid = s.createDiv("accueil-domaines");
		for (const d of domaines) {
			const col = grid.createDiv("accueil-domaine");
			const top = col.createDiv("accueil-card-top");
			top.createSpan({ cls: "accueil-red accueil-caps", text: d.numero });
			const go = arrow(top);
			go.addEventListener("click", () => this.reveal(d.path));
			col.createDiv({ cls: "accueil-domaine-title", text: d.titre }).addEventListener("click", () => this.reveal(d.path));
			if (d.accroche) col.createDiv({ cls: "accueil-accroche", text: d.accroche });
			col.createDiv("accueil-filet");
			const pills = col.createDiv("accueil-pills");
			d.liens.forEach((l) => this.pill(pills, l));
			if (d.enPlus) {
				const more = pills.createDiv({ cls: "accueil-pill is-more", text: `+${d.enPlus}` });
				more.addEventListener("click", () => this.reveal(d.path));
			}
		}
	}

	private quotidien(s: HTMLElement, q: Quotidien) {
		if (q.dossiers.length) {
			const pills = s.createDiv("accueil-pills");
			q.dossiers.forEach((l) => this.pill(pills, l));
		}
		const tiles = s.createDiv("accueil-tiles");
		for (const n of q.notes) {
			const tile = tiles.createDiv("accueil-tile");
			if (n.emoji) tile.createSpan({ cls: "accueil-tile-emoji", text: n.emoji });
			tile.createSpan({ text: n.label });
			tile.addEventListener("click", () => this.openPath(n.path));
		}
	}

	private pill(parent: HTMLElement, l: Link) {
		const pill = parent.createDiv({ cls: "accueil-pill", text: l.label });
		pill.addEventListener("click", () => (l.kind === "folder" ? this.openFolder(l.path) : this.openPath(l.path)));
	}

	/** Dossier : son _État.md, sinon la note qui porte son nom (emoji ignoré), sinon l'explorateur. */
	private openFolder(path: string) {
		const folder = this.app.vault.getAbstractFileByPath(path);
		if (!(folder instanceof TFolder)) return;
		const name = splitEmoji(folder.name).label;
		const target =
			folder.children.find((c): c is TFile => c instanceof TFile && c.name === "_État.md") ??
			folder.children.find((c): c is TFile => c instanceof TFile && c.extension === "md" && splitEmoji(c.basename).label === name);
		if (target) this.app.workspace.getLeaf(false).openFile(target);
		else this.reveal(path);
	}

	private openPath(path: string, fallbackFolder?: string) {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) this.app.workspace.getLeaf(false).openFile(file);
		else if (fallbackFolder) this.reveal(fallbackFolder);
	}

	/** Montre le dossier dans l'explorateur de gauche, panneau ouvert et dossier déplié. */
	private reveal(path: string) {
		const folder = this.app.vault.getAbstractFileByPath(path);
		const explorer = (this.app as any).internalPlugins?.getPluginById?.("file-explorer")?.instance;
		if (!folder || !explorer?.revealInFolder) return;
		this.app.workspace.leftSplit.expand();
		explorer.revealInFolder(folder);
		// API interne de l'explorateur : sans elle, le dossier est sélectionné mais reste replié.
		const view = this.app.workspace.getLeavesOfType("file-explorer")[0]?.view as any;
		view?.fileItems?.[path]?.setCollapsed?.(false);
	}
}

function arrow(parent: HTMLElement): HTMLElement {
	const a = parent.createSpan("accueil-arrow");
	setIcon(a, "arrow-up-right");
	return a;
}

function roman(n: number): string {
	return ["I", "II", "III", "IV", "V"][n - 1] ?? String(n);
}
