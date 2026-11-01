import { describe, expect, it } from "vitest";
import { addTask, checkTask, sansRelance, extractTasks, taskLabel } from "../src/etat";

describe("extractTasks", () => {
	it("prend les cases non cochées de la section, dans l'ordre, jusqu'au ## suivant", () => {
		expect(extractTasks("## Prochaine action\n\n- [ ] Définir le catalogue\n- [x] Fait\n* [ ] Brancher TikTok\n\nDétail.\n## Tranché\n- [ ] Autre"))
			.toEqual(["Définir le catalogue", "Brancher TikTok"]);
	});
	it("ignore ce qui précède la section, les sous-listes et les puces sans case", () => {
		expect(extractTasks("---\nzone: x\n---\n## Où on en est\n- [ ] Pas ça\n## Prochaine action\n- **Pas une case**\n\t- [ ] Sous-tâche\n- [ ] Ça"))
			.toEqual(["Ça"]);
	});
	it("accepte une capitale, un suffixe et les fins de ligne Windows", () => {
		expect(extractTasks("## Prochaine Action ⏭\r\n- [ ] Ça\r\n")).toEqual(["Ça"]);
	});
	it("renvoie une liste vide sans section ou sans case", () => {
		expect(extractTasks("# X\n## Où on en est\nbla")).toEqual([]);
		expect(extractTasks("## Prochaine action\n**Ancien format**\n## Tranché\n")).toEqual([]);
	});
});

describe("checkTask", () => {
	const note = "## Où on en est\n- [ ] B\n## Prochaine action\r\n- [ ] A\r\n- [ ] B\r\n## Tranché\n- [ ] B";
	it("coche la tâche dans la section seulement, sans toucher aux fins de ligne", () => {
		expect(checkTask(note, "B", "2026-11-01")).toBe("## Où on en est\n- [ ] B\n## Prochaine action\r\n- [ ] A\r\n- [x] B ✅ 2026-11-01\r\n## Tranché\n- [ ] B");
	});
	it("rend la note inchangée si la tâche n'y est plus", () => {
		expect(checkTask(note, "Z", "2026-11-01")).toBe(note);
	});
});

describe("taskLabel", () => {
	it("retire le gras", () => expect(taskLabel("**Finir** l'électrique")).toBe("Finir l'électrique"));
});

describe("addTask", () => {
	it("ajoute en fin du paquet de cases, avant le détail", () => {
		expect(addTask("## Prochaine action\n\n- [ ] Priorité\n- [x] Fait\n\t- sous-ligne\n\nDétail.\n## Tranché\n", "Nouvelle"))
			.toBe("## Prochaine action\n\n- [ ] Priorité\n- [x] Fait\n\t- sous-ligne\n- [ ] Nouvelle\n\nDétail.\n## Tranché\n");
	});
	it("sans case, se place sous le titre ; la priorité reste la première", () => {
		const md = addTask("# X\n## Prochaine action\n\n## Tranché\n", "  Payer les charges ");
		expect(md).toBe("# X\n## Prochaine action\n\n- [ ] Payer les charges\n\n## Tranché\n");
		expect(extractTasks(addTask(md, "Ensuite"))).toEqual(["Payer les charges", "Ensuite"]);
	});
	it("crée la section si elle manque et garde les fins de ligne Windows", () => {
		expect(addTask("# X\r\nbla\r\n\r\n", "Ça")).toBe("# X\r\nbla\r\n\r\n## Prochaine action\r\n\r\n- [ ] Ça\r\n");
	});
});

describe("sansRelance", () => {
	it("lit `relance: non` dans l'en-tête seulement", () => {
		expect(sansRelance("---\r\nzone: x\r\nrelance: non\r\n---\r\n# X")).toBe(true);
		expect(sansRelance("---\nrelance: oui\n---\n")).toBe(false);
		expect(sansRelance("# X\nrelance: non\n")).toBe(false);
	});
});
