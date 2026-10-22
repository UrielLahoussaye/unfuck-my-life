import { describe, expect, it } from "vitest";
import { checkTask, extractTasks, taskLabel } from "../src/etat";

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
		expect(checkTask(note, "B")).toBe("## Où on en est\n- [ ] B\n## Prochaine action\r\n- [ ] A\r\n- [x] B\r\n## Tranché\n- [ ] B");
	});
	it("rend la note inchangée si la tâche n'y est plus", () => {
		expect(checkTask(note, "Z")).toBe(note);
	});
});

describe("taskLabel", () => {
	it("retire le gras", () => expect(taskLabel("**Finir** l'électrique")).toBe("Finir l'électrique"));
});
