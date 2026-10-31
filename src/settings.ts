import { Notice, PluginSettingTab, SecretComponent, Setting, TFolder, type App } from "obsidian";
import { interroger, MESURES_SHOPIFY, type Connecteur } from "./connecteurs";
import { aujourdhui, bornes } from "./plan";
import { buildHome, type Settings } from "./model";
import { toTree } from "./vaultTree";
import { ImageSuggest } from "./imageSuggest";
import type AccueilPlugin from "./main";

export const DEFAULT_SETTINGS: Settings = { accroches: {}, images: {}, quotidien: null, masques: [], vision: "Vision.canvas", connecteurs: [] };

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

		this.connecteurs(containerEl);

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

	/** Les sources des objectifs : une ligne par connecteur, ses champs selon son type, la clé dans le coffre d'Obsidian. */
	private connecteurs(el: HTMLElement) {
		const settings = this.plugin.settings;
		const liste = (settings.connecteurs ??= []);
		new Setting(el)
			.setName("Connecteurs")
			.setHeading()
			.setDesc("D'où viennent les chiffres atteints des objectifs. Dans la note du plan : [mesure:: identifiant.mesure]. Les clés restent dans le coffre d'Obsidian, sur cet appareil.");
		const save = () => this.plugin.saveSettings();
		liste.forEach((c, i) => {
			const bloc = el.createDiv("accueil-reglage-connecteur");
			new Setting(bloc)
				.setName(c.id || "Nouveau connecteur")
				.addText((t) => t.setPlaceholder("identifiant").setValue(c.id).onChange(async (v) => {
					c.id = v.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
					await save();
				}))
				.addDropdown((dd) => dd.addOption("shopify", "Shopify").addOption("json", "Requête JSON").setValue(c.type).onChange(async (v) => {
					c.type = v as Connecteur["type"];
					await save();
					this.display();
				}))
				.addButton((b) => b.setButtonText("Tester").onClick(async () => {
					try {
						const v = await interroger(this.app, c, bornes("mois", aujourdhui(), { path: "", projet: "", objectifs: [], jalons: [] }));
						new Notice(`${c.id}, ce mois-ci : ${Object.entries(v).map(([k, n]) => `${k} = ${n}`).join(", ") || "aucune mesure"}`);
					} catch (e) {
						new Notice(`${c.id} : ${(e as Error).message}`);
					}
				}))
				.addExtraButton((b) => b.setIcon("trash").setTooltip("Retirer").onClick(async () => {
					liste.splice(i, 1);
					await save();
					this.display();
				}));
			new Setting(bloc).setName("Clé").setDesc("Le secret, choisi ou créé dans le coffre d'Obsidian.").addComponent((cel) =>
				new SecretComponent(this.app, cel).setValue(c.secret).onChange(async (v) => {
					c.secret = v ?? "";
					await save();
				}),
			);
			const texte = (nom: string, desc: string, cle: "domaine" | "client" | "url" | "entete" | "prefixe", placeholder = "") =>
				new Setting(bloc).setName(nom).setDesc(desc).addText((t) => t.setPlaceholder(placeholder).setValue(c[cle] ?? "").onChange(async (v) => {
					c[cle] = v;
					await save();
				}));
			if (c.type === "shopify") {
				texte("Domaine", `Mesures fournies : ${MESURES_SHOPIFY.join(", ")}.`, "domaine", "ma-boutique.myshopify.com");
				texte("ID client", "App du Dev Dashboard (droit read_orders) : son ID client ici, son « Client secret » dans la clé. Vide : la clé est un jeton Admin.", "client");
				return;
			}
			texte("Adresse", "{debut} et {fin} deviennent les dates de la période (AAAA-MM-JJ).", "url", "https://…");
			new Setting(bloc).setName("Méthode").addDropdown((dd) => dd.addOption("GET", "GET").addOption("POST", "POST").setValue(c.methode ?? "GET").onChange(async (v) => {
				c.methode = v as "GET" | "POST";
				await save();
				this.display();
			}));
			if (c.methode === "POST") {
				new Setting(bloc).setName("Corps").setDesc("JSON envoyé, mêmes remplacements.").addTextArea((t) => t.setPlaceholder('{"debut":"{debut}","fin":"{fin}"}').setValue(c.corps ?? "").onChange(async (v) => {
					c.corps = v;
					await save();
				}));
			}
			texte("En-tête de la clé", "Par défaut Authorization.", "entete", "Authorization");
			texte("Avant la clé", "Par défaut « Bearer ».", "prefixe", "Bearer ");
			new Setting(bloc).setName("Mesures").setDesc("Une par ligne : nom = chemin dans la réponse (data.ca, 0.total).").addTextArea((t) => t.setPlaceholder("ca = ca\nca_projete = ca_projete").setValue(c.mesures ?? "").onChange(async (v) => {
				c.mesures = v;
				await save();
			}));
		});
		new Setting(el).addButton((b) => b.setButtonText("+ Ajouter un connecteur").onClick(async () => {
			liste.push({ id: "", type: "json", secret: "" });
			await save();
			this.display();
		}));
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
