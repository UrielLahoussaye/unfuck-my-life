import { Modal, Notice, Setting, TFile, type App } from "obsidian";
import { ajouterJalon, aujourdhui, type NouveauJalon, type Plan } from "./plan";

/**
 * Fenêtre « Un jalon » : le plan, le texte, l'échéance, et au besoin le début et le losange.
 * La case s'écrit dans la note du plan ; la frise se redessine d'elle-même.
 */
export class JalonModal extends Modal {
	private jalon: NouveauJalon = { texte: "", echeance: aujourdhui(), jalon: false };

	constructor(app: App, private plans: Plan[], private path: string) {
		super(app);
	}

	onOpen() {
		this.titleEl.setText("Un jalon");
		const el = this.contentEl;
		if (this.plans.length > 1) {
			new Setting(el).setName("Projet").addDropdown((d) => {
				for (const p of this.plans) d.addOption(p.path, p.projet);
				d.setValue(this.path).onChange((v) => (this.path = v));
			});
		}
		new Setting(el).setName("Jalon").addText((t) => {
			t.setPlaceholder("Le dépliant arrive").onChange((v) => (this.jalon.texte = v));
			t.inputEl.addEventListener("keydown", (e) => e.key === "Enter" && this.ajouter());
			window.setTimeout(() => t.inputEl.focus(), 0);
		});
		this.date(el, "Échéance", "", this.jalon.echeance, (v) => (this.jalon.echeance = v));
		this.date(el, "Début", "Facultatif : pour ce qui dure, une barre sur la frise.", "", (v) => (this.jalon.debut = v || undefined));
		new Setting(el)
			.setName("Moment clé")
			.setDesc("Un losange plein sur la frise.")
			.addToggle((t) => t.onChange((v) => (this.jalon.jalon = v)));
		new Setting(el)
			.addButton((b) => b.setButtonText("Annuler").onClick(() => this.close()))
			.addButton((b) => b.setCta().setButtonText("Ajouter").onClick(() => this.ajouter()));
	}

	/** Un champ date natif : le sélecteur du système, sur PC comme sur iPad. */
	private date(el: HTMLElement, nom: string, desc: string, valeur: string, onChange: (v: string) => void) {
		new Setting(el)
			.setName(nom)
			.setDesc(desc)
			.addText((t) => {
				t.inputEl.type = "date";
				t.setValue(valeur).onChange(onChange);
			});
	}

	private async ajouter() {
		const j = this.jalon;
		if (!j.texte.trim()) return new Notice("Écris le jalon.");
		if (!j.echeance) return new Notice("Choisis l'échéance.");
		if (j.debut && j.debut > j.echeance) return new Notice("Le début tombe après l'échéance.");
		const file = this.app.vault.getAbstractFileByPath(this.path);
		if (!(file instanceof TFile)) return new Notice("Ce plan n'existe plus.");
		await this.app.vault.process(file, (md) => ajouterJalon(md, j));
		new Notice("Jalon ajouté.");
		this.close();
	}

	onClose() {
		this.contentEl.empty();
	}
}
