# Accueil — le plugin Obsidian « Unfuck My Life »

> TypeScript · esbuild · vitest · API Obsidian (PC et iPad)
> L'état du projet et les décisions vivent dans le vault **Mon Cerveau** :
> `3. L'ATELIER/Unfuck My Life (Plugin accueil)/_État.md`, et le format des plans dans
> `Mode d'emploi — Plans.md` à côté. Ici, le code seulement.

## Où sont les choses

| Quoi                                             | Où                                                    |
| ------------------------------------------------ | ----------------------------------------------------- |
| Entrée du plugin, rafraîchissement               | `src/main.ts`                                          |
| La vue : barre d'onglets, dessin de la page      | `src/view.ts`                                          |
| Un fichier par onglet                            | `src/onglets/` (accueil, vision, entrainement, plan)   |
| Logique pure, testée (plans, `_État.md`, modèle) | `src/plan.ts`, `src/etat.ts`, `src/model.ts` · `tests/` |
| Connecteurs (Shopify, JSON) et leurs clés        | `src/connecteurs.ts` — clés dans `app.secretStorage`   |
| Fenêtres (Tâche, Jalon, Souvenir)                | `src/tache.ts`, `src/jalon.ts`, `src/souvenir.ts`      |
| Tout le style                                    | `styles.css`                                           |
| Specs et plans                                   | `docs/superpowers/specs/` · `plans/`                   |
| Pièges payés (iPad…)                             | `.claude/rules/`                                       |

## Démarrage

1. `graphify-out/graph.json` absent → mauvais dépôt ou machine fraîche : **stop, demander**.
2. `git fetch` ; en retard → `git pull`, puis `graphify update .` (le hook ne tourne pas sur un pull).
3. Question d'architecture → `graphify-out/GRAPH_REPORT.md` d'abord.

## Règles

- **Le code est un chef-d'œuvre de simplicité** : la section « Coder » de `_Socle/Méthode.md` du vault.
- **L'API Obsidian avant le code maison** (`Setting`, `Modal`, `vault.process`, `secretStorage`…) :
  Context7 pour sa doc.
- **La logique va dans une fonction pure, testée** (`src/plan.ts`, `src/etat.ts`) ; les onglets ne font que dessiner.
- **Rien de vivant ne s'écrit dans le vault** : un chiffre se lit en direct, jamais recopié dans une note.
- **Tout doit tenir sur iPad** : lire `.claude/rules/mobile.md` avant de toucher au CSS.
- **Conventional Commits**, en français.

## Livrer

- `npm run build` : vérifie les types, construit, et copie `main.js`, `manifest.json`, `styles.css`
  dans `.obsidian/plugins/accueil/` du vault (chemin dans `esbuild.config.mjs`). L'heure du build
  s'affiche sous la date : c'est elle qui dit si l'iPad a reçu la version par Sync.
- `npm test` avant chaque commit qui touche à la logique.
- Commit à chaque étape qui marche ; push par lots, **toujours en fin de session**.
- Fin de session : une décision → `_État.md` du vault ; un piège → `.claude/rules/`. Rien d'autre.

## Nouvelle machine

`npm install` → `pip install graphifyy` → `graphify update .` → `graphify hook install`.
Le chemin du vault est écrit en dur dans `esbuild.config.mjs` : à adapter si le Bureau change.
