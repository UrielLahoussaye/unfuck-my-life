import { describe, expect, it } from "vitest";
import { memoraName } from "../src/memora";

describe("memoraName", () => {
	const d = new Date(2026, 6, 3, 9, 5);
	it("nomme comme Mémora, sans titre", () => expect(memoraName(d, "  ")).toBe("Memora_2026-07-03_09h05"));
	it("nettoie le titre comme Mémora", () => expect(memoraName(d, "Chanson avec maman, Bretagne !")).toBe("Memora_2026-07-03_09h05_Chanson_avec_maman_Bretagne_"));
});
