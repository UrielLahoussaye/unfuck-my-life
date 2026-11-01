import { TFile, setIcon } from "obsidian";
import { addLogRow, enHaut, illustration, jourLog, parseLog, parseProgramme, prochaineSeance, PROGRAMME, resume, type Exercice, type Ligne } from "../entrainement";
import { button, roman, type Hote } from "./commun";

/** L'onglet Entraînement : le programme de salle, une gélule par séance, une carte par exercice. */
export class OngletEntrainement {
	/** La séance choisie ; sans choix, la prochaine. Oubliée quand on change d'onglet. */
	seance?: number | "regles";
	/** Ce qui est tapé sur une carte pas encore cochée, par exercice : la page se redessine à chaque coche, la saisie doit survivre. */
	private saisies = new Map<string, { charge: string; reps: string }>();

	constructor(private v: Hote) {}

	/** Le programme de salle : une gélule par séance, une carte par exercice, ou par règle. */
	async rendre(root: HTMLElement) {
		const file = this.v.app.vault.getAbstractFileByPath(PROGRAMME);
		const md = file instanceof TFile ? await this.v.app.vault.cachedRead(file) : "";
		const p = parseProgramme(md);
		this.v.header(root, "Entraînement", p.accroche);
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
			this.v.render();
		});
		return pill;
	}

	/** Une carte numérotée ; un exercice porte son illustration (fond uni sans image) et son volume. Rend le bloc de texte. */
	private exo(parent: HTMLElement, i: number, nom: string, volume?: string, image?: string): HTMLElement {
		const card = parent.createDiv("accueil-exo");
		if (image) {
			const pic = card.createDiv("accueil-exo-image");
			const file = this.v.app.vault.getAbstractFileByPath(image);
			if (file instanceof TFile) pic.createEl("img", { attr: { src: this.v.app.vault.getResourcePath(file), alt: "" } });
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

	private async ecrireLog(ligne: Ligne) {
		const file = this.v.app.vault.getAbstractFileByPath(PROGRAMME);
		if (file instanceof TFile) await this.v.app.vault.process(file, (md) => addLogRow(md, ligne));
	}
}

/** Un champ de saisie avec son unité ; le clavier du téléphone suit `mode`. */
function champ(parent: HTMLElement, unite: string, mode: string, value = ""): HTMLInputElement {
	const label = parent.createEl("label", "accueil-champ");
	const input = label.createEl("input", { type: "text", value, attr: { inputmode: mode } });
	label.createSpan({ cls: "accueil-caps", text: unite });
	return input;
}
