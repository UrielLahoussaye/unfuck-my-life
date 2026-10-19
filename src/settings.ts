import { PluginSettingTab, Setting, TFolder, type App } from "obsidian";
import { buildHome, type Settings } from "./model";
import { toTree } from "./vaultTree";
import type AccueilPlugin from "./main";

export const DEFAULT_SETTINGS: Settings = { accroches: {}, quotidien: null, masques: [] };

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

		new Setting(containerEl).setName("Accroches").setHeading().setDesc("Une phrase sous le titre. Vide : pas d'accroche.");
		const home = buildHome(await toTree(this.app, settings.masques), settings);
		for (const { titre, path } of [...home.metiers, ...home.domaines]) {
			new Setting(containerEl).setName(titre).addText((t) =>
				t.setValue(settings.accroches[path] ?? "").onChange(async (v) => {
					if (v.trim()) settings.accroches[path] = v;
					else delete settings.accroches[path];
					await this.plugin.saveSettings();
				}),
			);
		}
	}
}
