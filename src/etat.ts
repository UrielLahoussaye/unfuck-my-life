/** Une case à cocher, au premier niveau de la liste : `- [ ] tâche`. */
const OPEN_TASK = /^[-*]\s+\[ \]\s+(.+)$/;
const SECTION = /^##\s+Prochaine action\b/i;

/** Les tâches non cochées de la section « ## Prochaine action », dans l'ordre : la première est la priorité. */
export function extractTasks(markdown: string): string[] {
	const lines = markdown.split(/\r?\n/);
	const start = lines.findIndex((l) => SECTION.test(l.trim()));
	if (start < 0) return [];
	const tasks: string[] = [];
	for (const line of lines.slice(start + 1)) {
		if (/^##\s/.test(line)) break;
		const m = line.trimEnd().match(OPEN_TASK);
		if (m) tasks.push(m[1].trim());
	}
	return tasks;
}

/** Coche la tâche `task` dans la section « ## Prochaine action ». Rend le texte inchangé si elle n'y est plus. */
export function checkTask(markdown: string, task: string): string {
	const lines = markdown.split("\n");
	const start = lines.findIndex((l) => SECTION.test(l.trim()));
	if (start < 0) return markdown;
	for (let i = start + 1; i < lines.length && !/^##\s/.test(lines[i]); i++) {
		if (lines[i].trimEnd().match(OPEN_TASK)?.[1].trim() === task) {
			lines[i] = lines[i].replace("[ ]", "[x]");
			return lines.join("\n");
		}
	}
	return markdown;
}

/** Ce que la carte affiche d'une tâche : sans le gras du markdown. */
export const taskLabel = (task: string) => task.replace(/\*\*/g, "");
