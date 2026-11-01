import { Modal, Notice, TFile, type App } from "obsidian";
import { DEFAULT_SETTINGS, importImage, pickImage } from "../settings";
import { addToCanvas, parseVision, type VisionItem } from "../vision";
import { arrow, type Hote } from "./commun";

/** L'onglet Vision : le mur du canvas, images et affirmations. */
export class OngletVision {
	constructor(private v: Hote) {}

	private visionPath(): string {
		return this.v.plugin.settings.vision || DEFAULT_SETTINGS.vision!;
	}

	/** Le mur : images et affirmations du canvas, en colonnes ; un clic ouvre le canvas. */
	async rendre(s: HTMLElement) {
		const path = this.visionPath();
		const file = this.v.app.vault.getAbstractFileByPath(path);
		let items: VisionItem[] = [];
		let broken = false;
		if (file instanceof TFile) {
			try {
				items = parseVision(await this.v.app.vault.cachedRead(file));
			} catch {
				broken = true;
				s.createDiv({ cls: "accueil-muted accueil-wall-empty", text: `« ${path} » n'est pas un canvas lisible.` });
			}
		}
		const wall = s.createDiv("accueil-wall");
		for (const item of items) {
			let el: HTMLElement;
			if (item.kind === "image") {
				const img = this.v.app.vault.getAbstractFileByPath(item.path);
				if (!(img instanceof TFile)) continue;
				el = wall.createEl("img", { cls: "accueil-wall-item accueil-wall-image", attr: { src: this.v.app.vault.getResourcePath(img), alt: "" } });
			} else {
				el = wall.createDiv("accueil-wall-item accueil-wall-text");
				el.createDiv("accueil-filet");
				el.createDiv({ text: item.text });
			}
			el.addEventListener("click", () => this.v.openPath(path));
		}
		if (!wall.childElementCount && !broken) {
			s.createDiv({ cls: "accueil-muted accueil-wall-empty", text: "Ton tableau est vide : ajoute une image ou une affirmation." });
		}
		const bar = s.createDiv("accueil-wall-bar");
		bar.createDiv({ cls: "accueil-pill", text: "+ Image" }).addEventListener("click", () =>
			pickImage(async (f) => this.addToVision({ kind: "image", path: await importImage(this.v.app, f) })),
		);
		bar.createDiv({ cls: "accueil-pill", text: "+ Affirmation" }).addEventListener("click", () =>
			new AffirmationModal(this.v.app, (text) => this.addToVision({ kind: "text", text })).open(),
		);
		if (file instanceof TFile) {
			const open = bar.createDiv({ cls: "accueil-wall-open accueil-caps", text: "Modifier le tableau" });
			arrow(open);
			open.addEventListener("click", () => this.v.openPath(path));
		}
	}

	private async addToVision(item: VisionItem) {
		const path = this.visionPath();
		try {
			const existing = this.v.app.vault.getAbstractFileByPath(path);
			const file = existing instanceof TFile ? existing : await this.v.app.vault.create(path, "");
			await this.v.app.vault.process(file, (json) => addToCanvas(json, item));
		} catch (e) {
			new Notice(`Rien n'a été ajouté au tableau : ${(e as Error).message}`);
		}
	}
}

/** Une affirmation à taper ; Ctrl+Entrée valide. */
class AffirmationModal extends Modal {
	constructor(app: App, private onSubmit: (text: string) => void) {
		super(app);
	}

	onOpen() {
		this.titleEl.setText("Une affirmation");
		const area = this.contentEl.createEl("textarea", { cls: "accueil-affirmation", attr: { rows: "4", placeholder: "C’est déjà arrivé, c’est déjà là. Tu le ressens, tu l’écris : une vérité, une évidence." } });
		const submit = () => {
			const text = area.value.trim();
			if (!text) return;
			this.close();
			this.onSubmit(text);
		};
		area.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
		});
		const row = this.contentEl.createDiv("modal-button-container");
		row.createEl("button", { cls: "mod-cta", text: "Ajouter" }).addEventListener("click", submit);
		window.setTimeout(() => area.focus(), 0);
	}

	onClose() {
		this.contentEl.empty();
	}
}
