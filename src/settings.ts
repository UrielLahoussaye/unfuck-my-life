import { Notice, PluginSettingTab, Setting, TFolder, type App } from "obsidian";
import { buildHome, type Settings } from "./model";
import { toTree } from "./vaultTree";
import { ImageSuggest } from "./imageSuggest";
import type AccueilPlugin from "./main";

export const DEFAULT_SETTINGS: Settings = { accroches: {}, images: {}, quotidien: null, masques: [], vision: "Vision.canvas" };

export class AccueilSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: AccueilPlugin) {
		super(app, plugin);
	}

	async display() {
		const { containerEl } = this;
		const settings = this.plugin.settings;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Dossier du quotidien")
			.setDesc("Ses notes deviennent les tuiles d'« Au quotidien », ses sous-dossiers des gélules.")
			.addDropdown((dd) => {
				dd.addOption("", "Aucun");
				for (const f of this.app.vault.getAllLoadedFiles()) {
					if (f instanceof TFolder && f.path !== "/") dd.addOption(f.path, f.path);
				}
				dd.setValue(settings.quotidien ?? "").onChange(async (v) => {
					settings.quotidien = v || null;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Dossiers masqués")
			.setDesc("Un chemin par ligne. Un dossier masqué n'apparaît nulle part sur l'accueil.")
			.addTextArea((ta) =>
				ta.setValue(settings.masques.join("\n")).onChange(async (v) => {
					settings.masques = v.split("\n").map((l) => l.trim()).filter(Boolean);
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Tableau de vision")
			.setDesc("Le canvas qu'affiche « La Vision ». Créé au premier ajout s'il n'existe pas.")
			.addText((t) =>
				t.setPlaceholder("Vision.canvas").setValue(settings.vision ?? "").onChange(async (v) => {
					settings.vision = v.trim() || DEFAULT_SETTINGS.vision;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl)
			.setName("Cartes")
			.setHeading()
			.setDesc("Pour chaque projet et domaine : une accroche sous le titre, et une image du vault fondue sur le côté droit. Vide : rien.");
		const home = buildHome(await toTree(this.app, settings.masques), settings);
		const store = async (map: Record<string, string>, path: string, v: string) => {
			if (v.trim()) map[path] = v.trim();
			else delete map[path];
			await this.plugin.saveSettings();
		};
		for (const { titre, path } of [...home.metiers, ...home.domaines]) {
			let imageInput: HTMLInputElement;
			new Setting(containerEl)
				.setName(titre)
				.addText((t) => t.setPlaceholder("Accroche").setValue(settings.accroches[path] ?? "").onChange((v) => store(settings.accroches, path, v)))
				.addText((t) => {
					imageInput = t.inputEl;
					t.setPlaceholder("Image de fond").setValue(settings.images[path] ?? "").onChange((v) => store(settings.images, path, v));
					new ImageSuggest(this.app, t.inputEl, (v) => store(settings.images, path, v));
				})
				.addExtraButton((b) =>
					b
						.setIcon("image-plus")
						.setTooltip("Choisir une image sur l'ordinateur")
						.onClick(() =>
							pickImage(async (file) => {
								const target = await importImage(this.app, file);
								imageInput.value = target;
								await store(settings.images, path, target);
							}),
						),
				);
		}
	}
}

/** Copie une image de l'ordinateur dans le dossier des pièces jointes du vault ; renvoie son chemin. */
export async function importImage(app: App, file: File): Promise<string> {
	const target = await app.fileManager.getAvailablePathForAttachment(file.name);
	const parent = target.includes("/") ? target.slice(0, target.lastIndexOf("/")) : "";
	if (parent && !app.vault.getAbstractFileByPath(parent)) {
		throw new Error(`le dossier des pièces jointes « ${parent} » n'existe pas (Paramètres → Fichiers et liens)`);
	}
	await app.vault.createBinary(target, await file.arrayBuffer());
	return target;
}

/** Ouvre le sélecteur de fichiers du système, limité aux images. */
export function pickImage(onPick: (file: File) => Promise<void>) {
	// Rattaché au document : un champ fichier détaché n'ouvre pas toujours le sélecteur sous Electron.
	const input = document.body.createEl("input", { attr: { type: "file", accept: "image/*" } });
	input.style.display = "none";
	input.addEventListener("change", () => {
		const file = input.files?.[0];
		input.remove();
		if (file) onPick(file).then(() => new Notice(`Image importée : ${file.name}`)).catch((e) => new Notice(`Image non importée : ${e.message}`));
	});
	input.click();
}
