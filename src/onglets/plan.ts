import { TFile, setIcon } from "obsidian";
import { taskLabel } from "../etat";
import { etiquettes, evaluer, interroger, termes, type Valeurs } from "../connecteurs";
import { aujourdhui, basculer, bornes, chiffre, commeCible, dateCourte, ecart, fenetre, moisDe, nombre, palier, parsePlan, periodeDe, position, positionFin, type Fenetre, type Ligne as LigneDePlan, type Objectif, type Plan } from "../plan";
import type { Hote } from "./commun";

/** Une mesure lue : sa valeur, ou l'erreur, et pour une somme de sources la part de chacune. */
type Mesure = { quand: number; valeur?: number; erreur?: string; parts?: { nom: string; valeur: number }[] };

/** L'onglet Plan : les objectifs mesurés, puis la frise des jalons. */
export class OngletPlan {
	/** Le projet choisi ; sans choix, tous. */
	private projet: string | null = null;
	/** Les mesures lues, par expression et fenêtre : jamais écrites dans le vault. */
	private mesures = new Map<string, Mesure>();
	private enCours = new Set<string>();

	constructor(private v: Hote) {}

	/** Les notes marquées `type: plan`, hors dossiers masqués, rangées par projet. */
	private async plans(): Promise<Plan[]> {
		const masques = this.v.plugin.settings.masques;
		const files = this.v.app.vault
			.getMarkdownFiles()
			.filter((f) => this.v.app.metadataCache.getFileCache(f)?.frontmatter?.type === "plan")
			.filter((f) => !masques.some((m) => f.path === m || f.path.startsWith(m + "/")));
		const plans = await Promise.all(files.map(async (f) => parsePlan(await this.v.app.vault.cachedRead(f), f.path)));
		return plans.sort((a, b) => a.projet.localeCompare(b.projet, "fr"));
	}

	/** La page Timeline : les objectifs en cartes, puis la frise, une ligne par jalon. Maquette Figma 94:140. */
	async rendre(root: HTMLElement) {
		this.v.header(root, "Le Plan");
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
					this.v.render();
				});
			}
		}
		const vus = plans.filter((p) => !this.projet || p.projet === this.projet);
		let n = 0;
		const objectifs = vus.flatMap((p) => p.objectifs.map((o) => ({ p, o })));
		if (objectifs.length) {
			const s = this.v.section(root, ++n, "Objectifs", "ce qu’on vise");
			if (objectifs.some(({ o }) => o.mesure)) {
				const relire = s.querySelector(".accueil-section-head")!.createSpan({ cls: "accueil-caps accueil-relire", text: "↻ relire" });
				relire.addEventListener("click", () => {
					this.mesures.clear();
					this.v.render();
				});
			}
			this.objectifs(s, vus);
		}
		const f = fenetre(vus);
		if (!f) return;
		const s = this.v.section(root, ++n, "La frise", `${moisAn(f.debut)} → ${moisAn(f.fin)}`);
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
	 * Les objectifs, au calme : un bloc par projet (bandeau à l'image du dossier), une ligne par objectif.
	 * Repliable d'un clic sur « Objectifs » : la section tient alors sur une ligne, un point par objectif.
	 * Maquette Figma 104:140 (ouverte) et 104:224 (repliée).
	 */
	private objectifs(s: HTMLElement, vus: Plan[]) {
		const settings = this.v.plugin.settings;
		const replie = !!settings.objectifsReplies;
		const head = s.querySelector(".accueil-section-head")!;
		const titre = head.children[1] as HTMLElement;
		const chevron = createSpan({ cls: "accueil-objectifs-chevron" });
		setIcon(chevron, replie ? "chevron-right" : "chevron-down");
		titre.after(chevron);
		for (const el of [titre, chevron]) {
			el.addClass("accueil-cliquable");
			el.addEventListener("click", async () => {
				settings.objectifsReplies = !replie;
				await this.v.plugin.saveSettings();
				this.v.render();
			});
		}
		// Replié, les lignes se calculent quand même (pour les points), hors de la page.
		const corps = replie ? createDiv() : s.createDiv("accueil-obj-groupes");
		const etats: ("dessus" | "dessous" | null)[] = [];
		const mois = new Date().toLocaleDateString("fr-FR", { month: "long" });
		for (const p of vus) {
			if (!p.objectifs.length) continue;
			const groupe = corps.createDiv("accueil-obj-groupe");
			const bandeau = groupe.createDiv("accueil-obj-bandeau");
			this.v.background(bandeau, settings.images?.[p.path.split("/").slice(0, -1).join("/")]);
			const nom = bandeau.createSpan({ cls: "accueil-caps accueil-obj-projet", text: p.projet });
			nom.addEventListener("click", () => this.ouvrirA(p.path, 0));
			bandeau.createSpan({ cls: "accueil-obj-periode", text: [mois, p.fin && `jusqu’au ${dateCourte(p.fin)}`].filter(Boolean).join(" · ") });
			for (const o of p.objectifs) etats.push(this.ligneObjectif(groupe, p, o));
		}
		const sub = head.querySelector(".accueil-muted") as HTMLElement;
		sub.empty();
		const mesures = etats.filter((e) => e !== null);
		const dessus = etats.filter((e) => e === "dessus").length;
		sub.createSpan({ text: `${etats.length} objectif${etats.length > 1 ? "s" : ""}${mesures.length ? ` · ${dessus} au-dessus` : ""}` });
		if (replie && mesures.length) {
			const points = sub.createSpan("accueil-obj-points");
			for (const e of etats) points.createSpan(`accueil-obj-point ${e ? `is-${e}` : ""}`);
		}
	}

	/**
	 * Une ligne d'objectif : le nom, l'atteint face à la cible du moment, une barre fine, l'écart.
	 * Le détail (sources, cible finale, échéance) en info-bulle ; un clic ouvre la ligne dans la note.
	 * Rend « dessus » ou « dessous » quand l'objectif est mesuré, sinon null.
	 */
	private ligneObjectif(groupe: HTMLElement, p: Plan, o: Objectif): "dessus" | "dessous" | null {
		const ligne = groupe.createDiv("accueil-obj-ligne");
		if (o.fait) ligne.addClass("is-done");
		ligne.createDiv({ cls: "accueil-obj-nom", text: o.nom });
		const valeur = ligne.createDiv("accueil-obj-valeur");
		const grand = (texte: string) => valeur.createSpan({ cls: "accueil-obj-chiffre", text: texte });
		const petit = (texte: string, cls = "") => valeur.createSpan({ cls: `accueil-obj-cible ${cls}`, text: texte });
		const barre = ligne.createDiv("accueil-obj-barre");
		const ecartEl = ligne.createDiv("accueil-obj-ecart");
		const jour = aujourdhui();
		const pal = palier(o, p, jour);
		const bulle: string[] = [];
		let etat: "dessus" | "dessous" | null = null;
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
				petit(nombre(pal.valeur) === null ? `cible ${pal.valeur}` : `/ ${pal.valeur}`);
			} else {
				const atteint = pal.valeur.trim().endsWith("%") && o.mesure.includes("/") ? m.valeur * 100 : m.valeur;
				grand(commeCible(atteint, pal.valeur));
				petit(nombre(pal.valeur) === null ? `cible ${pal.valeur}` : `/ ${pal.valeur}`);
				if (m.parts) bulle.push(m.parts.map((x) => `${x.nom.charAt(0).toUpperCase()}${x.nom.slice(1)} ${commeCible(x.valeur, pal.valeur)}`).join(" · "));
				const vise = nombre(pal.valeur);
				const e = vise ? ecart(atteint, vise) : null;
				if (e) {
					etat = e.dessus ? "dessus" : "dessous";
					ecartEl.addClass(e.dessus ? "is-dessus" : "is-dessous");
					ecartEl.setText(`${e.dessus ? "↑" : "↓"} ${e.texte}`);
				}
				if (vise) {
					barre.createDiv().style.width = `${Math.min(atteint / vise, 1) * 100}%`;
					if (atteint >= vise) ligne.addClass("is-atteint");
				}
			}
		} else {
			const { valeur, unite } = chiffre(pal?.valeur ?? o.cible ?? "à fixer");
			grand(valeur);
			if (unite) petit(unite);
		}
		if (pal?.mois) bulle.push(`cible de ${pal.mois} : ${pal.valeur}`);
		if (pal && pal.valeur !== o.cible && o.cible) bulle.push(`cible finale : ${o.cible}`);
		if (o.echeance) bulle.push(`d’ici au ${dateCourte(o.echeance)}`);
		ligne.setAttr("aria-label", bulle.join("\n"));
		ligne.addEventListener("click", () => this.ouvrirA(p.path, o.ligne));
		return etat;
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
		const connecteurs = this.v.plugin.settings.connecteurs ?? [];
		const lus = new Map<string, Promise<Valeurs>>();
		const lire = async (id: string, mesure: string) => {
			const c = connecteurs.find((x) => x.id === id);
			if (!c) throw new Error(`connecteur « ${id} » inconnu`);
			if (!lus.has(id)) lus.set(id, interroger(this.v.app, c, f));
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
				if (this.v.page === "timeline") this.v.render();
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
		const file = this.v.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) await this.v.app.vault.process(file, (md) => basculer(md, j.ligne, j.texte));
	}

	/** Ouvre la note, curseur sur la ligne. */
	private ouvrirA(path: string, line: number) {
		const file = this.v.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) this.v.app.workspace.getLeaf(false).openFile(file, { eState: { line } });
	}
}

const QUINZE_MINUTES = 15 * 60 * 1000;

const pct = (x: number) => `${(x * 100).toFixed(3)}%`;

/** « 2026-11-01 » → « nov. 2026 » */
const moisAn = (date: string) => new Date(date + "T00:00:00Z").toLocaleDateString("fr-FR", { month: "short", year: "numeric", timeZone: "UTC" });
