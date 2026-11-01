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

/** La date de fin, au format du plugin Tasks : ` ✅ 2026-11-01`. */
export const FAIT_LE = /\s*✅\s*\d{4}-\d{2}-\d{2}/;

/** Coche une ligne de case et y écrit la date du jour (`jour` en AAAA-MM-JJ), comme le plugin Tasks. */
export function cocher(ligne: string, jour: string): string {
	const fin = ligne.endsWith("\r") ? "\r" : "";
	return `${ligne.trimEnd().replace(/\[ \]/, "[x]").replace(FAIT_LE, "")} ✅ ${jour}${fin}`;
}

/** Décoche une ligne de case et retire sa date de fin. */
export function decocher(ligne: string): string {
	const fin = ligne.endsWith("\r") ? "\r" : "";
	return ligne.trimEnd().replace(/\[[xX]\]/, "[ ]").replace(FAIT_LE, "") + fin;
}

/** Coche la tâche `task` dans la section « ## Prochaine action ». Rend le texte inchangé si elle n'y est plus. */
export function checkTask(markdown: string, task: string, jour: string): string {
	const lines = markdown.split("\n");
	const start = lines.findIndex((l) => SECTION.test(l.trim()));
	if (start < 0) return markdown;
	for (let i = start + 1; i < lines.length && !/^##\s/.test(lines[i]); i++) {
		if (lines[i].trimEnd().match(OPEN_TASK)?.[1].trim() === task) {
			lines[i] = cocher(lines[i], jour);
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

/** `relance: non` dans l'en-tête : un projet qu'on reprend quand on veut, dont l'Accueil ne montre pas les tâches. */
export function sansRelance(markdown: string): boolean {
	const entete = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
	return /^relance:\s*["']?non["']?\s*$/im.test(entete);
}

/** Ce que la carte affiche d'une tâche : sans le gras du markdown. */
export const taskLabel = (task: string) => task.replace(/\*\*/g, "");
