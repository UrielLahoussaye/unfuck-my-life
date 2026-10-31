/**
 * Les connecteurs : d'où viennent les chiffres atteints des objectifs.
 * Génériques : Shopify, ou n'importe quelle API qui rend du JSON. Les clés vivent dans le coffre d'Obsidian
 * (`app.secretStorage`), sur l'appareil ; les réglages ne gardent que le nom du secret.
 * Rien n'est jamais écrit dans le vault : un chiffre vivant y deviendrait faux sans que personne le voie.
 */
import { requestUrl, type App } from "obsidian";
import type { Fenetre } from "./plan";

export interface Connecteur {
	/** Court et sans espace : `boutique`, `fellowship`. C'est lui qu'on écrit dans `[mesure:: boutique.ca]`. */
	id: string;
	type: "shopify" | "json";
	/** Nom du secret dans le coffre d'Obsidian. */
	secret: string;
	/** Shopify : `ma-boutique.myshopify.com`. */
	domaine?: string;
	/**
	 * Shopify : l'ID client d'une app du Dev Dashboard installée sur sa propre boutique. Avec lui, le secret est le
	 * « Client secret » et le plugin échange un jeton de 24 h ; sans lui, le secret est un jeton Admin qui n'expire pas.
	 */
	client?: string;
	/** JSON : l'adresse, où `{debut}` et `{fin}` (AAAA-MM-JJ) sont remplacés. */
	url?: string;
	methode?: "GET" | "POST";
	/** JSON : le corps d'un POST, mêmes remplacements. */
	corps?: string;
	/** JSON : l'en-tête qui porte la clé (par défaut `Authorization`) et ce qui la précède (`Bearer `). */
	entete?: string;
	prefixe?: string;
	/** JSON : `nom = chemin.dans.la.reponse`, une mesure par ligne. */
	mesures?: string;
}

export type Valeurs = Record<string, number>;

/** Les mesures que fournit Shopify. */
export const MESURES_SHOPIFY = ["ca", "commandes"];

/** « ca = data.ca\nscans = 0.total » → [["ca", "data.ca"], ["scans", "0.total"]]. */
export function lireMesures(texte = ""): [string, string][] {
	return texte
		.split("\n")
		.map((l) => l.split("=").map((x) => x.trim()))
		.filter((p): p is [string, string] => p.length === 2 && !!p[0] && !!p[1]);
}

export function remplir(modele: string, f: Fenetre): string {
	return modele.replace(/\{debut\}/g, f.debut).replace(/\{fin\}/g, f.fin);
}

/** Suit `a.b.0.c` dans une réponse JSON ; rend un nombre ou lève une erreur qui dit où ça casse. */
export function suivre(json: unknown, chemin: string): number {
	let v: any = json;
	for (const pas of chemin.split(".")) {
		if (v === null || typeof v !== "object" || !(pas in v)) throw new Error(`« ${chemin} » introuvable dans la réponse`);
		v = v[pas];
	}
	const n = typeof v === "string" ? Number(v) : v;
	if (typeof n !== "number" || Number.isNaN(n)) throw new Error(`« ${chemin} » n'est pas un nombre`);
	return n;
}

/**
 * Évalue `[mesure:: …]` : des termes `connecteur.mesure` additionnés, puis un éventuel `/` qui divise par une autre somme.
 * `lire(connecteur, mesure)` fournit chaque terme. Une division renvoie un quotient (0,22), à mettre en % par l'appelant ; un diviseur nul rend NaN.
 */
export async function evaluer(expression: string, lire: (connecteur: string, mesure: string) => Promise<number>): Promise<number> {
	const [haut, bas, ...trop] = expression.split("/");
	if (trop.length) throw new Error("une seule division par mesure");
	const somme = async (s: string) => {
		let total = 0;
		for (const terme of s.split("+").map((t) => t.trim()).filter(Boolean)) {
			const [c, m, ...reste] = terme.split(".");
			if (!c || !m || reste.length) throw new Error(`« ${terme} » : écrire connecteur.mesure`);
			total += await lire(c, m);
		}
		return total;
	};
	const n = await somme(haut);
	if (bas === undefined) return n;
	const d = await somme(bas);
	// Rien à diviser (aucune inscription cette semaine…) : pas une panne, une période vide.
	if (!d) return NaN;
	return n / d;
}

/** Les termes d'une somme pure (« b.ca + f.ca »), pour en montrer le détail. Une division ou un seul terme : rien à détailler. */
export function termes(expression: string): { connecteur: string; mesure: string }[] {
	if (expression.includes("/")) return [];
	const liste = expression.split("+").map((t) => t.trim()).filter(Boolean).map((t) => {
		const [connecteur = "", mesure = ""] = t.split(".");
		return { connecteur, mesure };
	});
	return liste.length > 1 ? liste : [];
}

/** Lit toutes les mesures d'un connecteur sur la fenêtre. */
export async function interroger(app: App, c: Connecteur, f: Fenetre): Promise<Valeurs> {
	const cle = c.secret ? app.secretStorage.getSecret(c.secret) : null;
	if (!cle) throw new Error(`${c.id} : clé absente du coffre`);
	return c.type === "shopify" ? shopify(c, cle, f) : json(c, cle, f);
}

async function json(c: Connecteur, cle: string, f: Fenetre): Promise<Valeurs> {
	if (!c.url) throw new Error(`${c.id} : adresse manquante`);
	const methode = c.methode ?? "GET";
	const res = await requestUrl({
		url: remplir(c.url, f),
		method: methode,
		headers: { [c.entete || "Authorization"]: (c.prefixe ?? "Bearer ") + cle, "Content-Type": "application/json" },
		body: methode === "POST" && c.corps ? remplir(c.corps, f) : undefined,
		throw: false,
	});
	if (res.status >= 400) throw new Error(`${c.id} : réponse ${res.status}`);
	const out: Valeurs = {};
	for (const [nom, chemin] of lireMesures(c.mesures)) out[nom] = suivre(res.json, chemin);
	return out;
}

const VERSION_SHOPIFY = "2025-10";
const COMMANDES = `query($q: String!, $apres: String) {
	orders(first: 250, after: $apres, query: $q) {
		nodes { currentTotalPriceSet { shopMoney { amount } } }
		pageInfo { hasNextPage endCursor }
	}
}`;

/** Les jetons de 24 h, gardés en mémoire jusqu'à une heure avant leur fin. */
const jetons = new Map<string, { jeton: string; fin: number }>();

/** L'échange « client credentials » de Shopify : réservé aux apps de sa propre organisation, sur ses propres boutiques. */
async function jetonShopify(domaine: string, client: string, secret: string): Promise<string> {
	const cle = `${domaine}|${client}`;
	const connu = jetons.get(cle);
	if (connu && Date.now() < connu.fin) return connu.jeton;
	const res = await requestUrl({
		url: `https://${domaine}/admin/oauth/access_token`,
		method: "POST",
		contentType: "application/x-www-form-urlencoded",
		body: new URLSearchParams({ client_id: client, client_secret: secret, grant_type: "client_credentials" }).toString(),
		throw: false,
	});
	const jeton = res.json?.access_token;
	if (res.status >= 400 || !jeton) throw new Error(`Shopify refuse l'ID client ou le secret (${res.status})`);
	jetons.set(cle, { jeton, fin: Date.now() + (Number(res.json.expires_in ?? 86399) - 3600) * 1000 });
	return jeton;
}

/** CA (remboursements déduits) et nombre des commandes payées, créées dans la fenêtre. */
async function shopify(c: Connecteur, secret: string, f: Fenetre): Promise<Valeurs> {
	if (!c.domaine) throw new Error(`${c.id} : domaine manquant`);
	const cle = c.client ? await jetonShopify(c.domaine, c.client, secret) : secret;
	const q = `created_at:>=${f.debut} created_at:<=${f.fin}T23:59:59 (financial_status:paid OR financial_status:partially_refunded)`;
	let ca = 0;
	let commandes = 0;
	let apres: string | null = null;
	do {
		const res = await requestUrl({
			url: `https://${c.domaine}/admin/api/${VERSION_SHOPIFY}/graphql.json`,
			method: "POST",
			headers: { "X-Shopify-Access-Token": cle, "Content-Type": "application/json" },
			body: JSON.stringify({ query: COMMANDES, variables: { q, apres } }),
			throw: false,
		});
		if (res.status >= 400) throw new Error(`${c.id} : Shopify a répondu ${res.status}`);
		const orders = res.json?.data?.orders;
		if (!orders) throw new Error(`${c.id} : ${res.json?.errors?.[0]?.message ?? "réponse illisible"}`);
		for (const o of orders.nodes) ca += Number(o.currentTotalPriceSet.shopMoney.amount);
		commandes += orders.nodes.length;
		apres = orders.pageInfo.hasNextPage ? orders.pageInfo.endCursor : null;
	} while (apres);
	return { ca: Math.round(ca * 100) / 100, commandes };
}
