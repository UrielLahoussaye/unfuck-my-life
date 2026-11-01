import { Modal, Notice, TFile, type App } from "obsidian";
import { addTask } from "./etat";
import { destination, filtrer, type Destination } from "./model";

const MAX_SUGGESTIONS = 6;

/**
 * Fenêtre « Une tâche » : on tape quelques lettres pour choisir un _État.md, on écrit la tâche, Entrée.
 * La tâche s'ajoute en fin de « Prochaine action » : la priorité ne change pas.
 */
export class TacheModal extends Modal {
	private choix?: Destination;
	private suggestions: Destination[] = [];
	private actif = 0;

	constructor(app: App, private masques: string[]) {
		super(app);
	}

	onOpen() {
		this.modalEl.addClass("accueil-souvenir", "accueil-tache-modal");
		this.titleEl.setText("Une tâche");
		const toutes = this.app.vault
			.getMarkdownFiles()
			.filter((f) => f.name === "_État.md" && !this.masques.some((m) => f.path === m || f.path.startsWith(m + "/")))
			.map((f) => destination(f.path));

		const el = this.contentEl;
		const ou = el.createEl("input", { cls: "accueil-souvenir-titre", attr: { type: "text", placeholder: "Où ? (Rose de France, Fellowship…)" } });
		const liste = el.createDiv("accueil-destinations");
		const tache = el.createEl("input", { cls: "accueil-tache-champ", attr: { type: "text", placeholder: "Ce qu'il y a à faire" } });
		const row = el.createDiv("modal-button-container");
		row.createEl("button", { text: "Annuler" }).addEventListener("click", () => this.close());
		row.createEl("button", { cls: "mod-cta", text: "Ajouter" }).addEventListener("click", () => this.ajouter(tache.value));

		const dessiner = () => {
			liste.empty();
			this.suggestions = this.choix ? [] : filtrer(toutes, ou.value).slice(0, MAX_SUGGESTIONS);
			this.suggestions.forEach((d, i) => {
				const item = liste.createDiv({ cls: `accueil-destination${i === this.actif ? " is-active" : ""}` });
				item.createSpan({ text: d.nom });
				item.createSpan({ cls: "accueil-muted", text: d.chemin });
				item.addEventListener("mousedown", (e) => {
					e.preventDefault(); // garder le focus jusqu'au choix
					choisir(d);
				});
			});
		};
		const choisir = (d: Destination) => {
			this.choix = d;
			ou.value = d.chemin ? `${d.nom}  ·  ${d.chemin}` : d.nom;
			dessiner();
			tache.focus();
		};

		ou.addEventListener("input", () => {
			this.choix = undefined;
			this.actif = 0;
			dessiner();
		});
		ou.addEventListener("keydown", (e) => {
			const n = this.suggestions.length;
			if (e.key === "ArrowDown" && n) this.actif = (this.actif + 1) % n;
			else if (e.key === "ArrowUp" && n) this.actif = (this.actif - 1 + n) % n;
			else if (e.key === "Enter" && n) choisir(this.suggestions[this.actif]);
			else if (e.key === "Enter" && this.choix) tache.focus();
			else return;
			e.preventDefault();
			if (!this.choix) dessiner();
		});
		tache.addEventListener("keydown", (e) => {
			if (e.key !== "Enter") return;
			e.preventDefault();
			this.ajouter(tache.value);
		});

		dessiner();
		window.setTimeout(() => ou.focus(), 0);
	}

	private async ajouter(texte: string) {
		if (!this.choix) return new Notice("Choisis d'abord où l'écrire.");
		if (!texte.trim()) return new Notice("Écris la tâche.");
		const file = this.app.vault.getAbstractFileByPath(this.choix.etat);
		if (!(file instanceof TFile)) return new Notice("Ce _État.md n'existe plus.");
		await this.app.vault.process(file, (md) => addTask(md, texte));
		new Notice(`Ajouté à ${this.choix.nom}.`);
		this.close();
	}

	onClose() {
		this.contentEl.empty();
	}
}
