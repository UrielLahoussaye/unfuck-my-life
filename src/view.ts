import { ItemView, Modal, Notice, TFile, TFolder, setIcon, type App, type WorkspaceLeaf } from "obsidian";
import { addLogRow, enHaut, illustration, jourLog, parseLog, parseProgramme, prochaineSeance, PROGRAMME, resume, type Exercice, type Ligne } from "./entrainement";
import { checkTask, taskLabel } from "./etat";
import { etiquettes, evaluer, interroger, termes, type Valeurs } from "./connecteurs";
import { aujourdhui, basculer, bornes, chiffre, commeCible, dateCourte, ecart, fenetre, moisDe, nombre, palier, parsePlan, periodeDe, position, positionFin, type Fenetre, type Ligne as LigneDePlan, type Objectif, type Plan } from "./plan";
import { buildHome, splitEmoji, type Domaine, type Link, type Metier, type Paquet, type Quotidien } from "./model";
import { DEFAULT_SETTINGS, importImage, pickImage } from "./settings";
import { SouvenirModal } from "./souvenir";
import { addToCanvas, parseVision, type VisionItem } from "./vision";
import { toTree } from "./vaultTree";
import type AccueilPlugin from "./main";

export const VIEW_TYPE_ACCUEIL = "accueil-view";


/** Une mesure lue : sa valeur, ou l'erreur, et pour une somme de sources la part de chacune. */
type Mesure = { quand: number; valeur?: number; erreur?: string; parts?: { nom: string; valeur: number }[] };
export class AccueilView extends ItemView {
	private page: "accueil" | "vision" | "entrainement" | "timeline" = "accueil";
	/** Le projet choisi sur la page Plan ; sans choix, tous. */
	private projet: string | null = null;
	/** Les mesures lues, par expression et fenêtre : jamais écrites dans le vault. */
	private mesures = new Map<string, Mesure>();
	private enCours = new Set<string>();
	/** La séance choisie dans l'onglet Entraînement ; sans choix, la prochaine. */
	private seance?: number | "regles";
	/** La tâche tirée au mélange, par _État.md. Valable le jour du tirage : le lendemain, chaque paquet repart de sa priorité. */
	private tirages = new Map<string, { jour: string; task: string }>();
	/** Ce qui est tapé sur une carte pas encore cochée, par exercice : la page se redessine à chaque coche, la saisie doit survivre. */
	private saisies = new Map<string, { charge: string; reps: string }>();

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
		if (this.page === "timeline") {
			await this.timeline(root);
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
		for (const [page, label] of [["accueil", "Accueil"], ["vision", "Vision"], ["entrainement", "Entraînement"], ["timeline", "Plan"]] as const) {
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
			this.saisies.delete(e.nom);
			text.parentElement!.addClass("is-done");
			const row = text.createDiv("accueil-exo-fait accueil-caps");
			setIcon(row.createSpan("accueil-exo-coche"), "check");
			row.createSpan({ text: ["Noté", resume(fait)].filter(Boolean).join(" · ") });
			return;
		}
		const derniere = passes.pop();
		const saisie = this.saisies.get(e.nom) ?? { charge: derniere?.charge ?? "", reps: "" };
		const row = text.createDiv("accueil-saisie");
		const charge = champ(row, "kg", "decimal", saisie.charge);
		const reps = champ(row, "reps", "numeric", saisie.reps);
		row.addEventListener("input", () => this.saisies.set(e.nom, { charge: charge.value, reps: reps.value }));
		// Chaque coche s'écrit tout de suite : rien ne se perd si le téléphone ferme Obsidian en pleine séance.
		button(row, "check", "Noter", () =>
			this.ecrireLog({ date: jour, seance, exercice: e.nom, charge: charge.value.trim(), reps: reps.value.trim() }),
		);
		if (derniere) {
			const plus = enHaut(e.volume, derniere.reps) ? " → +poids" : "";
			text.createDiv({ cls: "accueil-exo-rappel accueil-caps", text: `La dernière fois : ${resume(derniere)}${plus}` });
		}
	}

	/** Les notes marquées `type: plan`, hors dossiers masqués, rangées par projet. */
	private async plans(): Promise<Plan[]> {
		const masques = this.plugin.settings.masques;
		const files = this.app.vault
			.getMarkdownFiles()
			.filter((f) => this.app.metadataCache.getFileCache(f)?.frontmatter?.type === "plan")
			.filter((f) => !masques.some((m) => f.path === m || f.path.startsWith(m + "/")));
		const plans = await Promise.all(files.map(async (f) => parsePlan(await this.app.vault.cachedRead(f), f.path)));
		return plans.sort((a, b) => a.projet.localeCompare(b.projet, "fr"));
	}

	/** La page Timeline : les objectifs en cartes, puis la frise, une ligne par jalon. Maquette Figma 94:140. */
	private async timeline(root: HTMLElement) {
		this.header(root, "Le Plan");
		const plans = await this.plans();
		if (!plans.length) {
			root.createDiv({ cls: "accueil-muted", text: "Aucun plan : une note avec « type: plan » en tête, et ses sections « ## Objectifs » et « ## Jalons »." });
			return;
		}
		const projets = [...new Set(plans.map((p) => p.projet))];
		if (this.projet && !projets.includes(this.projet)) this.projet = null;
		if (projets.length > 1) {
			const bar = root.createDiv("accueil-pills accueil-plan-filtres");
			for (const nom of [null, ...projets]) {
				const pill = bar.createDiv({ cls: "accueil-pill", text: nom ?? "Tous les projets" });
				if (nom === this.projet) pill.addClass("is-active");
				pill.addEventListener("click", () => {
					this.projet = nom;
					this.render();
				});
			}
		}
		const vus = plans.filter((p) => !this.projet || p.projet === this.projet);
		let n = 0;
		const objectifs = vus.flatMap((p) => p.objectifs.map((o) => ({ p, o })));
		if (objectifs.length) {
			const s = this.section(root, ++n, "Objectifs", "ce qu’on vise");
			if (objectifs.some(({ o }) => o.mesure)) {
				const relire = s.querySelector(".accueil-section-head")!.createSpan({ cls: "accueil-caps accueil-relire", text: "↻ relire" });
				relire.addEventListener("click", () => {
					this.mesures.clear();
					this.render();
				});
			}
			const grid = s.createDiv("accueil-objectifs");
			for (const { p, o } of objectifs) this.objectif(grid, p, o, projets.length > 1 && !this.projet);
		}
		const f = fenetre(vus);
		if (!f) return;
		const s = this.section(root, ++n, "La frise", `${moisAn(f.debut)} → ${moisAn(f.fin)}`);
		const frise = s.createDiv("accueil-frise");
		const fond = frise.createDiv("accueil-frise-fond");
		moisDe(f).forEach((m, i) => {
			const bande = fond.createDiv("accueil-frise-mois");
			if (i % 2 === 0) bande.addClass("is-pair");
			bande.style.left = pct(m.debut);
			bande.style.width = pct(m.fin - m.debut);
			bande.createDiv({ cls: "accueil-caps", text: m.nom });
		});
		const jour = aujourdhui();
		if (jour >= f.debut && jour <= f.fin) {
			const trait = fond.createDiv("accueil-frise-auj");
			trait.style.left = pct(position(jour, f));
			trait.createSpan({ cls: "accueil-caps", text: "Aujourd’hui" });
		}
		frise.createDiv("accueil-frise-tete");
		for (const p of vus) {
			const tete = frise.createDiv({ cls: "accueil-frise-projet accueil-caps", text: p.projet });
			tete.addEventListener("click", () => this.ouvrirA(p.path, 0));
			for (const j of p.jalons) this.ligneDeFrise(frise, p, j, f);
		}
		frise.createDiv({ cls: "accueil-frise-legende accueil-muted", text: "◇ tâche · ◆ jalon (#jalon) · ▬ période (🛫 → 📅) · la case coche la ligne dans la note · un clic sur le texte ouvre la note" });
	}

	/**
	 * Une carte d'objectif. Avec une mesure : l'atteint en grand, face au palier du moment, et une barre.
	 * Sans mesure : le palier seul. L'image du dossier du plan en fond, comme sur l'Accueil. Maquette Figma 97:140.
	 */
	private objectif(grid: HTMLElement, p: Plan, o: Objectif, avecProjet: boolean) {
		const card = grid.createDiv("accueil-objectif");
		if (o.fait) card.addClass("is-done");
		this.background(card, this.plugin.settings.images?.[p.path.split("/").slice(0, -1).join("/")]);
		card.createDiv("accueil-filet");
		card.createDiv({ cls: "accueil-caps accueil-objectif-nom", text: o.nom });
		const jour = aujourdhui();
		const pal = palier(o, p, jour);
		const moment = pal?.mois ? ` en ${pal.mois}` : "";
		const ligne = card.createDiv("accueil-objectif-cible");
		const grand = (texte: string) => ligne.createSpan({ cls: "accueil-objectif-valeur", text: texte });
		const petit = (texte: string, cls = "") => ligne.createSpan({ cls: `accueil-objectif-unite ${cls}`, text: texte });
		if (o.mesure && pal) {
			const m = this.mesurer(o.mesure, bornes(periodeDe(o), jour, p));
			if (m?.erreur) {
				grand("—");
				petit(m.erreur, "accueil-red");
			} else if (m?.valeur !== undefined && Number.isNaN(m.valeur)) {
				grand("—");
				petit(`rien à mesurer ${{ mois: "ce mois-ci", semaine: "cette semaine", trimestre: "ces trois mois", plan: "pour l'instant" }[periodeDe(o)]}`);
			} else if (m?.valeur === undefined) {
				grand("…");
				petit(nombre(pal.valeur) === null ? `cible ${pal.valeur}` : `sur ${pal.valeur}${moment}`);
			} else {
				const atteint = pal.valeur.trim().endsWith("%") && o.mesure.includes("/") ? m.valeur * 100 : m.valeur;
				grand(commeCible(atteint, pal.valeur));
				petit(nombre(pal.valeur) === null ? `cible ${pal.valeur}` : `sur ${pal.valeur}${moment}`);
				if (m.parts) {
					const detail = m.parts.map((x) => `${x.nom.charAt(0).toUpperCase()}${x.nom.slice(1)} ${commeCible(x.valeur, pal.valeur)}`);
					card.createDiv({ cls: "accueil-muted accueil-objectif-detail", text: detail.join(" · ") });
				}
				const vise = nombre(pal.valeur);
				const e = vise ? ecart(atteint, vise) : null;
				if (e) {
					const pastille = card.createDiv({ cls: `accueil-objectif-ecart ${e.dessus ? "is-dessus" : "is-dessous"}` });
					setIcon(pastille.createSpan(), e.dessus ? "arrow-up" : "arrow-down");
					pastille.createSpan({ text: e.texte });
				}
				if (vise) {
					const barre = card.createDiv("accueil-objectif-barre").createDiv();
					barre.style.width = `${Math.min(atteint / vise, 1) * 100}%`;
					if (atteint >= vise) card.addClass("is-atteint");
				}
			}
		} else {
			const { valeur, unite } = chiffre(pal?.valeur ?? o.cible ?? "à fixer");
			grand(valeur);
			if (unite || moment) petit([unite, moment.trim()].filter(Boolean).join(" "));
		}
		const finale = pal && pal.valeur !== o.cible && o.cible;
		const sous = [o.echeance && `d’ici au ${dateCourte(o.echeance)}`, finale, avecProjet && p.projet].filter(Boolean).join(" · ");
		if (sous) card.createDiv({ cls: "accueil-muted", text: sous });
		card.addEventListener("click", () => this.ouvrirA(p.path, o.ligne));
	}

	/**
	 * La valeur d'une mesure sur une fenêtre, gardée quinze minutes en mémoire. Absente ou périmée : lue en arrière-plan,
	 * puis la page se redessine. Rend ce qu'on a en attendant.
	 */
	private mesurer(expression: string, f: Fenetre): Mesure | undefined {
		const cle = `${expression}|${f.debut}|${f.fin}`;
		const connu = this.mesures.get(cle);
		if ((connu && Date.now() - connu.quand < QUINZE_MINUTES) || this.enCours.has(cle)) return connu;
		this.enCours.add(cle);
		const connecteurs = this.plugin.settings.connecteurs ?? [];
		const lus = new Map<string, Promise<Valeurs>>();
		const lire = async (id: string, mesure: string) => {
			const c = connecteurs.find((x) => x.id === id);
			if (!c) throw new Error(`connecteur « ${id} » inconnu`);
			if (!lus.has(id)) lus.set(id, interroger(this.app, c, f));
			const v = (await lus.get(id)!)[mesure];
			if (v === undefined) throw new Error(`${id} ne fournit pas « ${mesure} »`);
			return v;
		};
		// Une somme de plusieurs sources garde aussi la part de chacune (les lectures sont déjà en mémoire).
		const detail = async (valeur: number): Promise<Mesure> => {
			const t = termes(expression);
			if (!t.length) return { quand: Date.now(), valeur };
			const noms = etiquettes(t);
			const parts = await Promise.all(t.map(async (x, i) => ({ nom: noms[i], valeur: await lire(x.connecteur, x.mesure) })));
			return { quand: Date.now(), valeur, parts };
		};
		evaluer(expression, lire)
			.then(detail)
			.then((m) => this.mesures.set(cle, m))
			.catch((e: Error) => this.mesures.set(cle, { quand: Date.now(), erreur: e.message }))
			.finally(() => {
				this.enCours.delete(cle);
				if (this.page === "timeline") this.render();
			});
		return connu;
	}

	private ligneDeFrise(frise: HTMLElement, p: Plan, j: LigneDePlan, f: { debut: string; fin: string }) {
		const row = frise.createDiv("accueil-frise-ligne");
		if (j.fait) row.addClass("is-done");
		const label = row.createDiv("accueil-frise-label");
		const box = label.createEl("button", { cls: "accueil-frise-case", attr: { "aria-label": j.fait ? "Décocher" : "Cocher" } });
		if (j.fait) setIcon(box, "check");
		box.addEventListener("click", () => this.basculerJalon(p.path, j));
		label.createSpan({ text: taskLabel(j.texte) }).addEventListener("click", () => this.ouvrirA(p.path, j.ligne));
		const piste = row.createDiv("accueil-frise-piste");
		if (!j.echeance) return;
		if (j.debut) {
			const bande = piste.createDiv("accueil-frise-bande");
			bande.style.left = pct(position(j.debut, f));
			bande.style.width = pct(positionFin(j.echeance, f) - position(j.debut, f));
			bande.setAttr("aria-label", `${dateCourte(j.debut)} → ${dateCourte(j.echeance)}`);
		} else {
			const losange = piste.createDiv("accueil-frise-losange");
			if (j.jalon) losange.addClass("is-jalon");
			losange.style.left = pct((position(j.echeance, f) + positionFin(j.echeance, f)) / 2);
			losange.setAttr("aria-label", dateCourte(j.echeance));
		}
	}

	/** La case de la frise écrit dans la note ; le cache de métadonnées prévient l'accueil, qui se redessine. */
	private async basculerJalon(path: string, j: LigneDePlan) {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) await this.app.vault.process(file, (md) => basculer(md, j.ligne, j.texte));
	}

	/** Ouvre la note, curseur sur la ligne. */
	private ouvrirA(path: string, line: number) {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) this.app.workspace.getLeaf(false).openFile(file, { eState: { line } });
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

const QUINZE_MINUTES = 15 * 60 * 1000;

const pct = (x: number) => `${(x * 100).toFixed(3)}%`;

/** « 2026-11-01 » → « nov. 2026 » */
const moisAn = (date: string) => new Date(date + "T00:00:00Z").toLocaleDateString("fr-FR", { month: "short", year: "numeric", timeZone: "UTC" });

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
