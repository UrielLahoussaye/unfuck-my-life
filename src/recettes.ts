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

/** Carte + Espèces en euros ; AES-GCM authentifie le message, une mauvaise clé fait donc échouer ici. */
async function ouvrir(cle: CryptoKey, payload: string): Promise<number> {
	const b = octets(payload);
	const clair = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b.slice(0, 12) }, cle, b.slice(12));
	const { carte, especes } = JSON.parse(new TextDecoder().decode(clair)) as Record<string, string>;
	return (Number(carte) + Number(especes)) / 100;
}

/** Une copie de la réponse de l'exposeur où les recettes déchiffrées sont ajoutées à `ca_reel`, et à `ca` si `dans_ca`. */
export async function ajouterRecettes(reponse: Record<string, any>, phrase: string): Promise<Record<string, any>> {
	const cle = await deriver(phrase, reponse.cle);
	const copie = { ...reponse };
	for (const s of reponse.secrets as SecretRecettes[]) {
		let euros: number;
		try {
			euros = await ouvrir(cle, s.payload);
		} catch {
			throw new Error("phrase des recettes incorrecte");
		}
		copie.ca_reel = Math.round((Number(copie.ca_reel ?? 0) + euros) * 100) / 100;
		if (s.dans_ca) copie.ca = Math.round((Number(copie.ca ?? 0) + euros) * 100) / 100;
	}
	return copie;
}
