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

/** Une ligne de case à cocher au premier niveau, cochée ou non. */
const ANY_TASK = /^[-*]\s+\[[ xX]\]\s/;

/**
 * Ajoute `- [ ] tâche` à la fin du paquet de cases de « ## Prochaine action » : la priorité reste en tête,
 * le détail sous la liste reste dessous. Sans case, juste sous le titre ; sans section, une section en fin de note.
 */
export function addTask(markdown: string, task: string): string {
	const eol = markdown.includes("\r\n") ? "\r\n" : "\n";
	const lines = markdown.split(/\r?\n/);
	const line = `- [ ] ${task.trim()}`;
	const start = lines.findIndex((l) => SECTION.test(l.trim()));
	if (start < 0) {
		while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
		return [...lines, "", "## Prochaine action", "", line, ""].join(eol);
	}
	let end = start + 1;
	while (end < lines.length && lines[end].trim() === "") end++;
	if (end < lines.length && ANY_TASK.test(lines[end])) {
		// Le paquet : les cases et leurs sous-lignes indentées, jusqu'à la première autre ligne.
		while (end < lines.length && (ANY_TASK.test(lines[end]) || /^\s+\S/.test(lines[end]))) end++;
		lines.splice(end, 0, line);
	} else {
		lines.splice(start + 1, 0, "", line);
	}
	return lines.join(eol);
}

/** Ce que la carte affiche d'une tâche : sans le gras du markdown. */
export const taskLabel = (task: string) => task.replace(/\*\*/g, "");
