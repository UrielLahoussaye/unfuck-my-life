export interface NextAction {
	text: string;
	/** Autres paragraphes de la section qui commencent par du gras. */
	more: number;
}

const BOLD_START = /^(?:[-*]\s+)?\*\*(.+?)\*\*/;

/** Lit la section « ## Prochaine action » d'un _État.md et en tire une ligne d'affichage. */
export function extractNextAction(markdown: string): NextAction | null {
	const lines = markdown.split(/\r?\n/);
	const start = lines.findIndex((l) => /^##\s+Prochaine action\s*$/.test(l.trim()));
	if (start < 0) return null;
	const section: string[] = [];
	for (const line of lines.slice(start + 1)) {
		if (/^##\s/.test(line)) break;
		if (line.trim()) section.push(line.trim());
	}
	if (!section.length) return null;

	const bold = section.map((l) => l.match(BOLD_START)?.[1]).filter((b): b is string => !!b);
	const raw = bold[0] ?? section[0];
	const text = bold.length ? clean(raw) : raw;
	return { text, more: Math.max(bold.length - 1, 0) };
}

function clean(s: string): string {
	return s.split(/[(:]/)[0].trim().replace(/[.,;]+$/, "").trim();
}
