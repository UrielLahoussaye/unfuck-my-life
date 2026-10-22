import { Modal, Notice, normalizePath, type App } from "obsidian";
import { DOSSIER_MEMORA, memoraName } from "./memora";

/**
 * Fenêtre « Un souvenir » : un enregistrement audio ou un texte, écrit dans le dossier de Mémora.
 * Seul « Annuler » jette : fermer autrement (Échap, clic à côté) enregistre ce qui a été dit ou écrit.
 */
export class SouvenirModal extends Modal {
	private mode: "audio" | "texte" = "audio";
	private titre!: HTMLInputElement;
	private area?: HTMLTextAreaElement;
	private recorder?: MediaRecorder;
	private chunks: Blob[] = [];
	private timer?: number;
	private done = false;

	constructor(app: App) {
		super(app);
	}

	onOpen() {
		this.modalEl.addClass("accueil-souvenir");
		this.titleEl.setText("Un souvenir");
		this.draw();
	}

	private draw() {
		const el = this.contentEl;
		el.empty();
		this.area = undefined;
		const choice = el.createDiv("accueil-souvenir-choix");
		for (const [mode, label] of [["audio", "Audio"], ["texte", "Texte"]] as const) {
			const b = choice.createEl("button", { text: label, cls: mode === this.mode ? "mod-cta" : "" });
			b.addEventListener("click", () => {
				if (this.recorder || mode === this.mode) return;
				this.mode = mode;
				this.draw();
			});
		}
		this.titre = el.createEl("input", { cls: "accueil-souvenir-titre", attr: { type: "text", placeholder: "Titre (facultatif)" } });

		if (this.mode === "texte") {
			this.area = el.createEl("textarea", { cls: "accueil-affirmation", attr: { rows: "8" } });
			window.setTimeout(() => this.area?.focus(), 0);
		} else {
			const rec = el.createDiv("accueil-souvenir-rec");
			const button = rec.createEl("button", { cls: "accueil-souvenir-bouton", attr: { "aria-label": "Enregistrer / arrêter" } });
			const clock = rec.createDiv({ cls: "accueil-souvenir-temps", text: "00:00" });
			const status = rec.createDiv({ cls: "accueil-muted", text: "Prêt à écouter un souvenir" });
			button.addEventListener("click", () => (this.recorder ? this.recorder.stop() : this.start(button, clock, status)));
		}

		const row = el.createDiv("modal-button-container");
		row.createEl("button", { text: "Annuler" }).addEventListener("click", () => {
			this.done = true;
			this.close();
		});
		row.createEl("button", { cls: "mod-cta", text: "Enregistrer" }).addEventListener("click", () => this.close());
	}

	private async start(button: HTMLElement, clock: HTMLElement, status: HTMLElement) {
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
		if (!stream) return new Notice("Micro inaccessible.");
		// Le .m4a de Mémora si Obsidian sait le produire, sinon le format natif du navigateur.
		const mimeType = MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
		const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
		this.recorder = recorder;
		this.chunks = [];
		recorder.ondataavailable = (e) => this.chunks.push(e.data);
		recorder.onstop = () => {
			stream.getTracks().forEach((t) => t.stop());
			window.clearInterval(this.timer);
			this.recorder = undefined;
			button.removeClass("is-recording");
			status.setText("Souvenir prêt : Enregistrer pour le garder");
			if (this.done) this.save(); // la fenêtre a été fermée pendant l'enregistrement
		};
		const t0 = Date.now();
		this.timer = window.setInterval(() => {
			const s = Math.floor((Date.now() - t0) / 1000);
			clock.setText(`${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`);
		}, 250);
		recorder.start();
		button.addClass("is-recording");
		status.setText("un souvenir en cours…");
	}

	onClose() {
		const cancelled = this.done;
		this.done = true;
		if (this.recorder) {
			// onstop arrive après les dernières données : c'est lui qui enregistre, sauf annulation.
			if (cancelled) this.recorder.ondataavailable = null;
			this.recorder.stop();
		} else if (!cancelled) {
			this.save();
		}
		this.contentEl.empty();
	}

	private async save() {
		const texte = this.area?.value.trim();
		if (!texte && !this.chunks.length) return;
		const folder = normalizePath(DOSSIER_MEMORA);
		if (!this.app.vault.getAbstractFileByPath(folder)) await this.app.vault.createFolder(folder);
		const base = `${folder}/${memoraName(new Date(), this.titre.value)}`;
		if (texte) {
			await this.app.vault.create(this.free(base, "md"), texte + "\n");
		} else {
			const type = this.chunks[0].type;
			const data = await new Blob(this.chunks, { type }).arrayBuffer();
			await this.app.vault.createBinary(this.free(base, type.includes("mp4") ? "m4a" : "webm"), data);
		}
		new Notice("Souvenir enregistré.");
	}

	/** Un chemin libre : deux souvenirs dans la même minute ne s'écrasent pas. */
	private free(base: string, ext: string): string {
		let path = `${base}.${ext}`;
		for (let i = 2; this.app.vault.getAbstractFileByPath(path); i++) path = `${base}_${i}.${ext}`;
		return path;
	}
}
