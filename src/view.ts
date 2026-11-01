import { ItemView, TFile, TFolder, setIcon, type WorkspaceLeaf } from "obsidian";
import { buildHome, splitEmoji, type Link } from "./model";
import { SouvenirModal } from "./souvenir";
import { TacheModal } from "./tache";
import { toTree } from "./vaultTree";
import { OngletAccueil } from "./onglets/accueil";
import { roman, type Hote } from "./onglets/commun";
import { OngletEntrainement } from "./onglets/entrainement";
import { OngletPlan } from "./onglets/plan";
import { OngletVision } from "./onglets/vision";
import type AccueilPlugin from "./main";

export const VIEW_TYPE_ACCUEIL = "accueil-view";

/** La vue : la barre d'onglets, puis l'onglet choisi. Chaque onglet vit dans `onglets/`, avec son état. */
export class AccueilView extends ItemView implements Hote {
	page: "accueil" | "vision" | "entrainement" | "timeline" = "accueil";
	private accueil = new OngletAccueil(this);
	private vision = new OngletVision(this);
	private entrainement = new OngletEntrainement(this);
	private plan = new OngletPlan(this);

	constructor(leaf: WorkspaceLeaf, public plugin: AccueilPlugin) {
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
		const root = this.contentEl;
		const scroll = root.scrollTop;
		root.empty();
		root.addClass("accueil");
		this.tabs(root);
		if (this.page === "vision") {
			this.header(root, "Ma Vision");
			await this.vision.rendre(root.createDiv("accueil-section"));
		} else if (this.page === "entrainement") {
			await this.entrainement.rendre(root);
		} else if (this.page === "timeline") {
			await this.plan.rendre(root);
		} else {
			this.accueil.rendre(root, buildHome(await toTree(this.app, settings.masques), settings));
		}
		root.scrollTop = scroll;
	}

	private tabs(root: HTMLElement) {
		const bar = root.createDiv("accueil-tabs");
		for (const [page, label] of [["accueil", "Accueil"], ["vision", "Vision"], ["entrainement", "Entraînement"], ["timeline", "Plan"]] as const) {
			const tab = bar.createDiv({ cls: "accueil-tab accueil-caps", text: label });
			if (page === this.page) tab.addClass("is-active");
			tab.addEventListener("click", () => {
				if (page === this.page) return;
				this.page = page;
				this.entrainement.seance = undefined;
				this.contentEl.scrollTop = 0;
				this.render();
			});
		}
		const plus = bar.createEl("button", { cls: "accueil-tab-souvenir accueil-tab-tache accueil-caps", text: "Tâche" });
		setIcon(plus.createSpan({ prepend: true }), "plus");
		plus.addEventListener("click", () => new TacheModal(this.app, this.plugin.settings.masques).open());
		const add = bar.createEl("button", { cls: "accueil-tab-souvenir accueil-caps", text: "Souvenir" });
		setIcon(add.createSpan({ prepend: true }), "plus");
		add.addEventListener("click", () => new SouvenirModal(this.app).open());
	}

	header(root: HTMLElement, titre: string, accroche?: string) {
		const head = root.createDiv("accueil-head");
		const left = head.createDiv();
		const date = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
		left.createDiv({ cls: "accueil-date", text: date.toLocaleUpperCase("fr") });
		const title = left.createEl("h1", { cls: "accueil-title", text: titre });
		title.createSpan({ cls: "accueil-red", text: "." });
		if (accroche) left.createDiv({ cls: "accueil-accroche accueil-head-accroche", text: accroche });
		const search = head.createDiv("accueil-search");
		search.createSpan({ text: "Où veux-tu aller ?" });
		search.createSpan({ cls: "accueil-kbd", text: "Ctrl O" });
		search.addEventListener("click", () => (this.app as any).commands.executeCommandById("switcher:open"));
	}

	section(root: HTMLElement, n: number, label: string, sub: string): HTMLElement {
		const s = root.createDiv("accueil-section");
		const h = s.createDiv("accueil-section-head");
		h.createSpan({ cls: "accueil-red accueil-caps", text: roman(n) });
		h.createSpan({ cls: "accueil-caps", text: label });
		h.createDiv("accueil-rule");
		h.createSpan({ cls: "accueil-muted", text: sub });
		return s;
	}

	/** Pose l'image de fond, fondue vers la gauche. Renvoie false si l'image n'existe pas. */
	background(el: HTMLElement, path?: string): boolean {
		const file = path ? this.app.vault.getAbstractFileByPath(path) : null;
		if (!(file instanceof TFile)) return false;
		el.addClass("has-image");
		el.createDiv("accueil-bg").style.backgroundImage = `url("${this.app.vault.getResourcePath(file)}")`;
		return true;
	}

	pill(parent: HTMLElement, l: Link) {
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

	openPath(path: string, fallbackFolder?: string) {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) this.app.workspace.getLeaf(false).openFile(file);
		else if (fallbackFolder) this.reveal(fallbackFolder);
	}

	/** Montre le dossier dans l'explorateur de gauche, panneau ouvert et dossier déplié. */
	reveal(path: string) {
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
