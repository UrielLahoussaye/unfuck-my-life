import { Plugin, debounce } from "obsidian";
import { shouldRefresh, type Settings } from "./model";
import { AccueilSettingTab, DEFAULT_SETTINGS } from "./settings";
import { AccueilView, VIEW_TYPE_ACCUEIL } from "./view";

export default class AccueilPlugin extends Plugin {
	settings: Settings = structuredClone(DEFAULT_SETTINGS);

	async onload() {
		this.settings = { ...structuredClone(DEFAULT_SETTINGS), ...(await this.loadData()) };		this.addSettingTab(new AccueilSettingTab(this.app, this));

		this.registerView(VIEW_TYPE_ACCUEIL, (leaf) => new AccueilView(leaf, this));
		this.addRibbonIcon("home", "Ouvrir l'accueil", () => this.activateView());
		this.addCommand({ id: "ouvrir-accueil", name: "Ouvrir l'accueil", callback: () => this.activateView() });

		const refresh = debounce(() => this.refresh(), 300, true);
		this.app.workspace.onLayoutReady(() => {
			for (const evt of ["create", "modify", "delete", "rename"] as const) {
				this.registerEvent(this.app.vault.on(evt as "create", (f) => shouldRefresh(evt, f.path, this.settings.vision) && refresh()));
			}
			this.activateView();
		});
	}

	/** Ouvre l'accueil, ou ramène l'onglet existant : jamais deux. */
	async activateView() {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_ACCUEIL)[0];
		const leaf = existing ?? this.app.workspace.getLeaf("tab");
		if (!existing) await leaf.setViewState({ type: VIEW_TYPE_ACCUEIL, active: true });
		await this.app.workspace.revealLeaf(leaf);
	}

	refresh() {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_ACCUEIL)) {
			if (leaf.view instanceof AccueilView) leaf.view.render();
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.refresh();
	}
}
