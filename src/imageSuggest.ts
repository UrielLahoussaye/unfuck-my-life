import { AbstractInputSuggest, TFile, type App } from "obsidian";

const IMAGE = /^(png|jpe?g|webp|gif|avif|svg)$/i;

/** Propose les images du vault pendant la saisie d'un chemin. */
export class ImageSuggest extends AbstractInputSuggest<TFile> {
	constructor(app: App, private input: HTMLInputElement, private onPick: (path: string) => void) {
		super(app, input);
	}

	getSuggestions(query: string): TFile[] {
		const q = query.toLowerCase();
		return this.app.vault
			.getFiles()
			.filter((f) => IMAGE.test(f.extension) && f.path.toLowerCase().includes(q))
			.slice(0, 50);
	}

	renderSuggestion(file: TFile, el: HTMLElement) {
		el.setText(file.path);
	}

	selectSuggestion(file: TFile) {
		this.input.value = file.path;
		this.onPick(file.path);
		this.close();
	}
}
