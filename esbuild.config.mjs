import esbuild from "esbuild";
import builtins from "builtin-modules";
import { copyFileSync, mkdirSync } from "node:fs";

const VAULT_PLUGIN_DIR = "C:/Users/uriel/Desktop/MON CERVEAU (SYNC)/.obsidian/plugins/accueil";
const prod = process.argv[2] === "production";

// Copie le build dans le vault, où Obsidian le charge.
const deploy = {
	name: "deploy",
	setup(build) {
		build.onEnd((result) => {
			if (result.errors.length) return;
			mkdirSync(VAULT_PLUGIN_DIR, { recursive: true });
			for (const f of ["main.js", "manifest.json", "styles.css"]) copyFileSync(f, `${VAULT_PLUGIN_DIR}/${f}`);
			console.log(`déployé dans ${VAULT_PLUGIN_DIR}`);
		});
	},
};

const ctx = await esbuild.context({
	entryPoints: ["src/main.ts"],
	bundle: true,
	external: ["obsidian", "electron", "@codemirror/*", "@lezer/*", ...builtins],
	format: "cjs",
	target: "es2020",
	logLevel: "info",
	sourcemap: prod ? false : "inline",
	treeShaking: true,
	outfile: "main.js",
	plugins: [deploy],
});

if (prod) {
	await ctx.rebuild();
	process.exit(0);
} else {
	await ctx.watch();
}
