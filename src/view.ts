import { ItemView, Modal, Notice, TFile, TFolder, setIcon, type App, type WorkspaceLeaf } from "obsidian";
import { addLogRow, enHaut, illustration, jourLog, parseLog, parseProgramme, prochaineSeance, PROGRAMME, resume, type Exercice, type Ligne } from "./entrainement";
import { checkTask, taskLabel } from "./etat";
import { buildHome, splitEmoji, type Domaine, type Link, type Metier, type Paquet, type Quotidien } from "./model";
import { DEFAULT_SETTINGS, importImage, pickImage } from "./settings";
import { SouvenirModal } from "./souvenir";
import { addToCanvas, parseVision, type VisionItem } from "./vision";
import { toTree } from "./vaultTree";
import type AccueilPlugin from "./main";

export const VIEW_TYPE_ACCUEIL = "accueil-view";

export class AccueilView extends ItemView {
	private page: "accueil" | "vision" | "entrainement" = "accueil";
	/** La séance choisie dans l'onglet Entraînement ; sans choix, la prochaine. */
	private seance?: number | "regles";
	/** La tâche tirée au mélange, par _État.md. Valable le jour du tirage : le lendemain, chaque paquet repart de sa priorité. */
	private tirages = new Map<string, { jour: string; task: string }>();

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

		this.tabs(root);
		if (this.page === "vision") {
			this.header(root, "Ma Vision");
			await this.vision(root.createDiv("accueil-section"));
			root.scrollTop = scroll;
			return;
		}
		if (this.page === "entrainement") {
			await this.entrainement(root);
			root.scrollTop = scroll;
			return;
		}
		this.header(root, "Mon Cerveau");
		let n = 0;
		if (home.metiers.length) this.metiers(this.section(root, ++n, "Le Métier", "ce qui doit rapporter"), home.metiers);
		if (home.domaines.length) this.domaines(this.section(root, ++n, "Les Domaines", "le foyer, l’atelier, l’œuvre"), home.domaines);
		if (home.quotidien) this.quotidien(this.section(root, ++n, "Au quotidien", "les notes de tous les jours"), home.quotidien);
		root.scrollTop = scroll;
	}

	private tabs(root: HTMLElement) {
		const bar = root.createDiv("accueil-tabs");
		for (const [page, label] of [["accueil", "Accueil"], ["vision", "Vision"], ["entrainement", "Entraînement"]] as const) {
			const tab = bar.createDiv({ cls: "accueil-tab accueil-caps", text: label });
			if (page === this.page) tab.addClass("is-active");
			tab.addEventListener("click", () => {
				if (page === this.page) return;
				this.page = page;
				this.seance = undefined;
				this.contentEl.scrollTop = 0;
				this.render();
			});
		}
		const add = bar.createEl("button", { cls: "accueil-tab-souvenir accueil-caps", text: "Souvenir" });
		setIcon(add.createSpan({ prepend: true }), "plus");
		add.addEventListener("click", () => new SouvenirModal(this.app).open());
	}

	private header(root: HTMLElement, titre: string, accroche?: string) {
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
		if (!this.background(card, m.image)) card.createDiv({ cls: "accueil-watermark", text: m.romain });
		const top = card.createDiv("accueil-card-top");
		top.createSpan({ cls: "accueil-red accueil-caps", text: m.romain });
		arrow(top);
		card.createDiv("accueil-grow");
		card.createDiv({ cls: "accueil-card-title", text: m.titre });
		if (m.accroche) card.createDiv({ cls: "accueil-accroche", text: m.accroche });
		if (m.paquet || m.sousProjets.length) {
			const act = card.createDiv("accueil-action");
			if (m.paquet) this.tache(act, m.paquet, "accueil-action-main");
			for (const sp of m.sousProjets) this.tache(act, sp, "accueil-action-sub", `${sp.titre}  —  `);
			if (m.sousProjetsEnPlus) act.createDiv({ cls: "accueil-action-sub", text: `+${m.sousProjetsEnPlus} sous-projets` });
		}
		card.addEventListener("click", () => {
			this.openPath(`${m.path}/_État.md`);
			this.reveal(m.path);
		});
	}

	/** Une seule tâche du paquet est visible : la priorité, ou celle tirée au mélange aujourd'hui. */
	private tache(parent: HTMLElement, p: Paquet, cls: string, prefix = "") {
		const tirage = this.tirages.get(p.etat);
		const shown = tirage && tirage.jour === today() && p.tasks.includes(tirage.task) ? tirage.task : p.tasks[0];
		const line = parent.createDiv(`accueil-tache ${cls}`);
		line.createSpan({ cls: "accueil-tache-text", text: prefix + taskLabel(shown) });
		if (p.tasks.length > 1) {
			button(line, "shuffle", "Une autre tâche", () => {
				const others = p.tasks.filter((t) => t !== shown);
				this.tirages.set(p.etat, { jour: today(), task: others[Math.floor(Math.random() * others.length)] });
				this.render();
			});
		}
		// Cocher modifie le _État.md : le vault prévient l'accueil, qui se redessine avec la suivante.
		button(line, "check", "Fait", () => this.cocher(p.etat, shown));
	}

	private async cocher(path: string, task: string) {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) await this.app.vault.process(file, (md) => checkTask(md, task));
	}

	private domaines(s: HTMLElement, domaines: Domaine[]) {
		const grid = s.createDiv("accueil-domaines");
		for (const d of domaines) {
			const col = grid.createDiv("accueil-domaine");
			this.background(col, d.image);
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

	/** Le programme de salle : une gélule par séance, une carte par exercice, ou par règle. */
	private async entrainement(root: HTMLElement) {
		const file = this.app.vault.getAbstractFileByPath(PROGRAMME);
		const md = file instanceof TFile ? await this.app.vault.cachedRead(file) : "";
		const p = parseProgramme(md);
		this.header(root, "Entraînement", p.accroche);
		const s = root.createDiv("accueil-section");
		if (!p.seances.length && !p.regles.length) {
			s.createDiv({ cls: "accueil-muted", text: `« ${PROGRAMME} » est introuvable ou vide.` });
			return;
		}
		const log = parseLog(md);
		const prochaine = prochaineSeance(p.seances, log, new Date());
		const choix = this.seance ?? prochaine;
		const bar = s.createDiv("accueil-seances");
		p.seances.forEach((seance, i) => {
			const pill = this.seancePill(bar, i, choix);
			pill.createSpan({ cls: "accueil-red", text: roman(i + 1) });
			pill.createSpan({ text: seance.nom });
		});
		this.seancePill(bar, "regles", choix).createSpan({ text: "Règles" });

		const cards = s.createDiv("accueil-exos");
		if (choix === "regles") {
			p.regles.forEach((r, i) => this.exo(cards, i, r));
			return;
		}
		const seance = p.seances[choix];
		if (!seance) return;
		const quand = [seance.lieu, choix === prochaine && "Prochaine séance"].filter(Boolean).join(" · ");
		bar.createDiv({ cls: "accueil-seance-quand accueil-caps", text: quand });
		seance.exercices.forEach((e, i) => this.noter(this.exo(cards, i, e.nom, e.volume, illustration(e.nom)), seance.lettre, e, log));
	}

	private seancePill(bar: HTMLElement, seance: number | "regles", choix: number | "regles"): HTMLElement {
		const pill = bar.createDiv("accueil-pill accueil-caps accueil-seance");
		if (seance === choix) pill.addClass("is-active");
		pill.addEventListener("click", () => {
			this.seance = seance;
			this.render();
		});
		return pill;
	}

	/** Une carte numérotée ; un exercice porte son illustration (fond uni sans image) et son volume. Rend le bloc de texte. */
	private exo(parent: HTMLElement, i: number, nom: string, volume?: string, image?: string): HTMLElement {
		const card = parent.createDiv("accueil-exo");
		if (image) {
			const pic = card.createDiv("accueil-exo-image");
			const file = this.app.vault.getAbstractFileByPath(image);
			if (file instanceof TFile) pic.createEl("img", { attr: { src: this.app.vault.getResourcePath(file), alt: "" } });
		}
		const text = card.createDiv("accueil-exo-texte");
		text.createDiv({ cls: "accueil-exo-num accueil-caps", text: String(i + 1).padStart(2, "0") });
		text.createDiv({ cls: "accueil-exo-nom", text: nom });
		if (volume) text.createDiv({ cls: "accueil-exo-volume", text: volume });
		return text;
	}

	/** Sous l'exercice : ce qui est noté aujourd'hui, sinon kg et reps à noter, la charge reprise de la dernière fois. */
	private noter(text: HTMLElement, seance: string, e: Exercice, log: Ligne[]) {
		const jour = jourLog(new Date());
		const passes = log.filter((l) => l.exercice === e.nom);
		const fait = passes.filter((l) => l.date === jour).pop();
		if (fait) {
			text.parentElement!.addClass("is-done");
			const row = text.createDiv("accueil-exo-fait accueil-caps");
			setIcon(row.createSpan("accueil-exo-coche"), "check");
			row.createSpan({ text: ["Noté", resume(fait)].filter(Boolean).join(" · ") });
			return;
		}
		const derniere = passes.pop();
		const row = text.createDiv("accueil-saisie");
		const charge = champ(row, "kg", "decimal", derniere?.charge);
		const reps = champ(row, "reps", "numeric");
		// Chaque coche s'écrit tout de suite : rien ne se perd si le téléphone ferme Obsidian en pleine séance.
		button(row, "check", "Noter", () =>
			this.ecrireLog({ date: jour, seance, exercice: e.nom, charge: charge.value.trim(), reps: reps.value.trim() }),
		);
		if (derniere) {
			const plus = enHaut(e.volume, derniere.reps) ? " → +poids" : "";
			text.createDiv({ cls: "accueil-exo-rappel accueil-caps", text: `La dernière fois : ${resume(derniere)}${plus}` });
		}
	}

	private async ecrireLog(ligne: Ligne) {
		const file = this.app.vault.getAbstractFileByPath(PROGRAMME);
		if (file instanceof TFile) await this.app.vault.process(file, (md) => addLogRow(md, ligne));
	}

	private visionPath(): string {
		return this.plugin.settings.vision || DEFAULT_SETTINGS.vision!;
	}

	/** Le mur : images et affirmations du canvas, en colonnes ; un clic ouvre le canvas. */
	private async vision(s: HTMLElement) {
		const path = this.visionPath();
		const file = this.app.vault.getAbstractFileByPath(path);
		let items: VisionItem[] = [];
		let broken = false;
		if (file instanceof TFile) {
			try {
				items = parseVision(await this.app.vault.cachedRead(file));
			} catch {
				broken = true;
				s.createDiv({ cls: "accueil-muted accueil-wall-empty", text: `« ${path} » n'est pas un canvas lisible.` });
			}
		}
		const wall = s.createDiv("accueil-wall");
		for (const item of items) {
			let el: HTMLElement;
			if (item.kind === "image") {
				const img = this.app.vault.getAbstractFileByPath(item.path);
				if (!(img instanceof TFile)) continue;
				el = wall.createEl("img", { cls: "accueil-wall-item accueil-wall-image", attr: { src: this.app.vault.getResourcePath(img), alt: "" } });
			} else {
				el = wall.createDiv("accueil-wall-item accueil-wall-text");
				el.createDiv("accueil-filet");
				el.createDiv({ text: item.text });
			}
			el.addEventListener("click", () => this.openPath(path));
		}
		if (!wall.childElementCount && !broken) {
			s.createDiv({ cls: "accueil-muted accueil-wall-empty", text: "Ton tableau est vide : ajoute une image ou une affirmation." });
		}
		const bar = s.createDiv("accueil-wall-bar");
		bar.createDiv({ cls: "accueil-pill", text: "+ Image" }).addEventListener("click", () =>
			pickImage(async (f) => this.addToVision({ kind: "image", path: await importImage(this.app, f) })),
		);
		bar.createDiv({ cls: "accueil-pill", text: "+ Affirmation" }).addEventListener("click", () =>
			new AffirmationModal(this.app, (text) => this.addToVision({ kind: "text", text })).open(),
		);
		if (file instanceof TFile) {
			const open = bar.createDiv({ cls: "accueil-wall-open accueil-caps", text: "Modifier le tableau" });
			arrow(open);
			open.addEventListener("click", () => this.openPath(path));
		}
	}

	private async addToVision(item: VisionItem) {
		const path = this.visionPath();
		try {
			const existing = this.app.vault.getAbstractFileByPath(path);
			const file = existing instanceof TFile ? existing : await this.app.vault.create(path, "");
			await this.app.vault.process(file, (json) => addToCanvas(json, item));
		} catch (e) {
			new Notice(`Rien n'a été ajouté au tableau : ${(e as Error).message}`);
		}
	}

	/** Pose l'image de fond, fondue vers la gauche. Renvoie false si l'image n'existe pas. */
	private background(el: HTMLElement, path?: string): boolean {
		const file = path ? this.app.vault.getAbstractFileByPath(path) : null;
		if (!(file instanceof TFile)) return false;
		el.addClass("has-image");
		el.createDiv("accueil-bg").style.backgroundImage = `url("${this.app.vault.getResourcePath(file)}")`;
		return true;
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

/** Petit bouton rond de la carte : son clic n'ouvre pas la carte. */
function button(parent: HTMLElement, icon: string, label: string, onClick: () => void) {
	const b = parent.createEl("button", { cls: "accueil-tache-btn", attr: { "aria-label": label } });
	setIcon(b, icon);
	b.addEventListener("click", (e) => {
		e.stopPropagation();
		onClick();
	});
}

/** Un champ de saisie avec son unité ; le clavier du téléphone suit `mode`. */
function champ(parent: HTMLElement, unite: string, mode: string, value = ""): HTMLInputElement {
	const label = parent.createEl("label", "accueil-champ");
	const input = label.createEl("input", { type: "text", value, attr: { inputmode: mode } });
	label.createSpan({ cls: "accueil-caps", text: unite });
	return input;
}

const today = () => new Date().toDateString();

function arrow(parent: HTMLElement): HTMLElement {
	const a = parent.createSpan("accueil-arrow");
	setIcon(a, "arrow-up-right");
	return a;
}

/** Une affirmation à taper ; Ctrl+Entrée valide. */
class AffirmationModal extends Modal {
	constructor(app: App, private onSubmit: (text: string) => void) {
		super(app);
	}

	onOpen() {
		this.titleEl.setText("Une affirmation");
		const area = this.contentEl.createEl("textarea", { cls: "accueil-affirmation", attr: { rows: "4", placeholder: "C’est déjà arrivé, c’est déjà là. Tu le ressens, tu l’écris : une vérité, une évidence." } });
		const submit = () => {
			const text = area.value.trim();
			if (!text) return;
			this.close();
			this.onSubmit(text);
		};
		area.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
		});
		const row = this.contentEl.createDiv("modal-button-container");
		row.createEl("button", { cls: "mod-cta", text: "Ajouter" }).addEventListener("click", submit);
		window.setTimeout(() => area.focus(), 0);
	}

	onClose() {
		this.contentEl.empty();
	}
}

function roman(n: number): string {
	return ["I", "II", "III", "IV", "V"][n - 1] ?? String(n);
}
