/**
 * Les recettes chiffrées de Fellowship (Carte, Espèces), déchiffrées ici avec la phrase de l'enseigne.
 * Doit rester identique à `apps/web-v2/src/lib/cipher.ts` de Fellowship : PBKDF2-SHA-256 (sel et itérations de la
 * réponse), AES-GCM 256, charge = base64(IV de 12 octets ‖ chiffré), message `{"carte":"<centimes sur 12 chiffres>","especes":…}`,
 * phrase passée par `trim().normalize("NFC")`. Web Crypto seul. La phrase ne quitte jamais l'appareil.
 */

export interface CleRecettes {
	salt: string;
	iterations: number;
}

export interface SecretRecettes {
	payload: string;
	/** Pas de CA espéré sur cette date : ses recettes comptent dans `ca`, pas seulement dans `ca_reel`. */
	dans_ca: boolean;
}

const octets = (base64: string) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

async function deriver(phrase: string, cle: CleRecettes): Promise<CryptoKey> {
	const matiere = await crypto.subtle.importKey("raw", new TextEncoder().encode(phrase.trim().normalize("NFC")), "PBKDF2", false, ["deriveKey"]);
	return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: octets(cle.salt), iterations: cle.iterations }, matiere, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
}

/** Le texte déchiffré : Carte + Espèces, en centimes. AES-GCM authentifie le message, une mauvaise clé échoue donc ici. */
async function ouvrir(cle: CryptoKey, payload: string): Promise<string> {
	const b = octets(payload);
	return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: b.slice(0, 12) }, cle, b.slice(12)));
}

/** Carte + Espèces en euros ; null si le message ouvert n'a pas la forme attendue. */
function euros(clair: string): number | null {
	try {
		const { carte, especes } = JSON.parse(clair) as Record<string, unknown>;
		const total = (Number(carte) + Number(especes)) / 100;
		return Number.isFinite(total) ? total : null;
	} catch {
		return null;
	}
}

/** `cle` et `secrets` tels que l'exposeur les promet ; sinon, une erreur qui le dit plutôt qu'un calcul faux. */
function verifier(reponse: Record<string, any>): { cle: CleRecettes; secrets: SecretRecettes[] } {
	const { cle, secrets } = reponse;
	const cleBonne = cle && typeof cle.salt === "string" && Number.isInteger(cle.iterations) && cle.iterations > 0;
	const secretsBons = Array.isArray(secrets) && secrets.every((s) => s && typeof s.payload === "string" && typeof s.dans_ca === "boolean");
	if (!cleBonne || !secretsBons) throw new Error("recettes de Fellowship illisibles (cle ou secrets mal formés)");
	return { cle, secrets };
}

/** Une copie de la réponse de l'exposeur où les recettes déchiffrées sont ajoutées à `ca_reel`, et à `ca` si `dans_ca`. */
export async function ajouterRecettes(reponse: Record<string, any>, phrase: string): Promise<Record<string, any>> {
	const { cle: sel, secrets } = verifier(reponse);
	const cle = await deriver(phrase, sel);
	const copie = { ...reponse };
	for (const s of secrets) {
		let clair: string;
		try {
			clair = await ouvrir(cle, s.payload);
		} catch {
			throw new Error("phrase des recettes incorrecte");
		}
		const montant = euros(clair);
		// Le message s'ouvre (la phrase est bonne) mais ne contient pas deux montants : une recette abîmée, pas la phrase.
		if (montant === null) throw new Error("recette de Fellowship illisible");
		copie.ca_reel = Math.round((Number(copie.ca_reel ?? 0) + montant) * 100) / 100;
		if (s.dans_ca) copie.ca = Math.round((Number(copie.ca ?? 0) + montant) * 100) / 100;
	}
	return copie;
}
