import { setIcon, type App } from "obsidian";
import type AccueilPlugin from "../main";
import type { Link } from "../model";

/** Ce que la vue prête à ses onglets : le vault, les réglages, et les morceaux de page communs. */
export interface Hote {
	app: App;
	plugin: AccueilPlugin;
	readonly page: string;
	render(): Promise<void>;
	header(root: HTMLElement, titre: string, accroche?: string): void;
	section(root: HTMLElement, n: number, label: string, sub: string): HTMLElement;
	background(el: HTMLElement, path?: string): boolean;
	pill(parent: HTMLElement, l: Link): void;
	openPath(path: string, fallbackFolder?: string): void;
	reveal(path: string): void;
}

/** Petit bouton rond de la carte : son clic n'ouvre pas la carte. */
export function button(parent: HTMLElement, icon: string, label: string, onClick: () => void) {
	const b = parent.createEl("button", { cls: "accueil-tache-btn", attr: { "aria-label": label } });
	setIcon(b, icon);
	b.addEventListener("click", (e) => {
		e.stopPropagation();
		onClick();
	});
}

export function arrow(parent: HTMLElement): HTMLElement {
	const a = parent.createSpan("accueil-arrow");
	setIcon(a, "arrow-up-right");
	return a;
}

export function roman(n: number): string {
	return ["I", "II", "III", "IV", "V"][n - 1] ?? String(n);
}
