import { Plugin, debounce } from "obsidian";
import type { Settings } from "./model";
import { DEFAULT_SETTINGS } from "./settings";
import { AccueilView, VIEW_TYPE_ACCUEIL } from "./view";

export default class AccueilPlugin extends Plugin {
	settings: Settings = DEFAULT_SETTINGS;

	async onload() {
		this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };

		this.registerView(VIEW_TYPE_ACCUEIL, (leaf) => new AccueilView(leaf, this));
		this.addRibbonIcon("home", "Ouvrir l'accueil", () => this.activateView());
		this.addCommand({ id: "ouvrir-accueil", name: "Ouvrir l'accueil", callback: () => this.activateView() });

		const refresh = debounce(() => this.refresh(), 300, true);
		for (const evt of ["create", "modify", "delete", "rename"] as const) {
			this.registerEvent(this.app.vault.on(evt as "create", refresh));
		}

		this.app.workspace.onLayoutReady(() => this.activateView());
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
