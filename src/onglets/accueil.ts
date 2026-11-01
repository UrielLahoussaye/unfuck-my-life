import { TFile } from "obsidian";
import { checkTask, taskLabel } from "../etat";
import { aujourdhui } from "../plan";
import type { Domaine, HomeModel, Metier, Paquet, Quotidien } from "../model";
import { arrow, button, type Hote } from "./commun";

/** L'onglet Accueil : le Métier en cartes, les Domaines en colonnes, Au quotidien en tuiles. */
export class OngletAccueil {
	/** La tâche tirée au mélange, par _État.md. Valable le jour du tirage : le lendemain, chaque paquet repart de sa priorité. */
	private tirages = new Map<string, { jour: string; task: string }>();

	constructor(private v: Hote) {}

	rendre(root: HTMLElement, home: HomeModel) {
		this.v.header(root, "Mon Cerveau");
		let n = 0;
		if (home.metiers.length) this.metiers(this.v.section(root, ++n, "Le Métier", "ce qui doit rapporter"), home.metiers);
		if (home.domaines.length) this.domaines(this.v.section(root, ++n, "Les Domaines", "le foyer, l’atelier, l’œuvre"), home.domaines);
		if (home.quotidien) this.quotidien(this.v.section(root, ++n, "Au quotidien", "les notes de tous les jours"), home.quotidien);
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
		if (!this.v.background(card, m.image)) card.createDiv({ cls: "accueil-watermark", text: m.romain });
		const top = card.createDiv("accueil-card-top");
		top.createSpan({ cls: "accueil-red accueil-caps", text: m.romain });
		arrow(top);
		card.createDiv("accueil-grow");
		card.createDiv({ cls: "accueil-card-title", text: m.titre });
		if (m.accroche) card.createDiv({ cls: "accueil-accroche", text: m.accroche });
		this.taches(card, m);
		card.addEventListener("click", () => {
			this.v.openPath(`${m.path}/_État.md`);
			this.v.reveal(m.path);
		});
	}

	/** Le paquet du dossier puis une ligne par sous-dossier : commun aux cartes du Métier et aux colonnes des Domaines. */
	private taches(parent: HTMLElement, d: Pick<Metier, "paquet" | "sousProjets" | "sousProjetsEnPlus">) {
		if (!d.paquet && !d.sousProjets.length) return;
		const act = parent.createDiv("accueil-action");
		if (d.paquet) this.tache(act, d.paquet, "accueil-action-main");
		for (const sp of d.sousProjets) this.tache(act, sp, "accueil-action-sub", `${sp.titre}  —  `);
		if (d.sousProjetsEnPlus) act.createDiv({ cls: "accueil-action-sub", text: `+${d.sousProjetsEnPlus} sous-projets` });
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
				this.v.render();
			});
		}
		// Cocher modifie le _État.md : le vault prévient l'accueil, qui se redessine avec la suivante.
		button(line, "check", "Fait", () => this.cocher(p.etat, shown));
	}

	private async cocher(path: string, task: string) {
		const file = this.v.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) await this.v.app.vault.process(file, (md) => checkTask(md, task, aujourdhui()));
	}

	private domaines(s: HTMLElement, domaines: Domaine[]) {
		const grid = s.createDiv("accueil-domaines");
		for (const d of domaines) {
			const col = grid.createDiv("accueil-domaine");
			this.v.background(col, d.image);
			const top = col.createDiv("accueil-card-top");
			top.createSpan({ cls: "accueil-red accueil-caps", text: d.numero });
			const go = arrow(top);
			go.addEventListener("click", () => this.v.reveal(d.path));
			col.createDiv({ cls: "accueil-domaine-title", text: d.titre }).addEventListener("click", () => this.v.reveal(d.path));
			if (d.accroche) col.createDiv({ cls: "accueil-accroche", text: d.accroche });
			col.createDiv("accueil-filet");
			const pills = col.createDiv("accueil-pills");
			d.liens.forEach((l) => this.v.pill(pills, l));
			if (d.enPlus) {
				const more = pills.createDiv({ cls: "accueil-pill is-more", text: `+${d.enPlus}` });
				more.addEventListener("click", () => this.v.reveal(d.path));
			}
			this.taches(col, d);
		}
	}

	private quotidien(s: HTMLElement, q: Quotidien) {
		if (q.dossiers.length) {
			const pills = s.createDiv("accueil-pills");
			q.dossiers.forEach((l) => this.v.pill(pills, l));
		}
		const tiles = s.createDiv("accueil-tiles");
		for (const n of q.notes) {
			const tile = tiles.createDiv("accueil-tile");
			if (n.emoji) tile.createSpan({ cls: "accueil-tile-emoji", text: n.emoji });
			tile.createSpan({ text: n.label });
			tile.addEventListener("click", () => this.v.openPath(n.path));
		}
	}
}

const today = () => new Date().toDateString();
