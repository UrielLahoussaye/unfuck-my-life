# Brief — onglet « Entraînement » du plugin Accueil

Reprends ce travail, commencé dans une autre conversation le 22/10/2026. Tout ce qui suit est validé par Uriel ; ne rouvre pas les choix, demande si un point manque.

## Contexte
- Plugin : `C:\Users\uriel\Desktop\DEVs\Plugin` (TypeScript + esbuild, tests). Installé dans `MON CERVEAU (SYNC)\.obsidian\plugins\accueil`.
- Spec d'origine : `docs/superpowers/specs/2026-10-19-accueil-design.md`. État : `3. L'ATELIER/Accueil/_État.md` (décision déjà notée dans Tranché).
- Figma : fichier `NQs5DPaRjTEJhtu5cmJsX1` (« Accueil v2 »). Maquette validée : cadre `42:139` « Entraînement — B · Les cartes (1440) ».

## Ce qui est tranché
- Troisième onglet **Entraînement**, après Accueil et Vision, même barre que `tabs()` dans `src/view.ts`.
- Titre « Entraînement. » (point rouge), date, accroche = la ligne de citation de la note.
- Sous-onglets en gélules : **A · Haut lourd**, **B · Terrain**, **C · Haut volume**, **Règles**. À droite : le jour et le lieu de la séance affichée. Ouvre sur la prochaine séance selon le jour (Lun A, Mer B, Ven C).
- Une **carte par exercice** : illustration en tête, numéro, nom, volume en grand (Aboreto). Grille 4 colonnes en 1440, passe à la ligne.
- Règles : une carte par règle.
- **Source unique** : le plugin lit les tableaux de `0. INBOX/Notes/Santé/💪 Programme Salle.md` (sections `## A —`, `## B —`, `## C —`, liste `## Règles`). Rien à saisir dans les réglages. Ignorer `## Log` et `## Repères`.
- Une carte sans image garde un fond uni.

## Étape 1 — exporter les illustrations (bloqué côté cloud)
Exporte en PNG chaque cadre ci-dessous (Figma MCP, ou Export dans Figma) dans `System/Ressources/Entraînement/` du vault, **nommé exactement comme l'exercice dans la note** + `.png` :

| Nœud | Exercice |
|---|---|
| 42:237 | Développé couché |
| 42:244 | Rowing barre |
| 42:251 | Arnold press |
| 42:258 | Élévations latérales poulie |
| 42:265 | Shrugs + face pulls |
| 42:272 | Curl + barre au front |
| 42:279 | Soulevé de terre |
| 42:286 | Cou (flexion + extension) |
| 46:141 | Développé militaire debout |
| 46:144 | Développé incliné haltères |
| 46:147 | Tractions |
| 46:150 | Élévations latérales |
| 46:153 | Squat barre |
| 46:156 | Sprints en côte |
| 46:159 | Port de sac de sable |
| 46:162 | Pompes lestées + tractions |
| 46:165 | Port unilatéral (valise) |
| 46:168 | Footing ou marche lestée en côte, facile |

## Étape 2 — coder
- Maquette avant tout : `get_design_context` sur `42:139`, réutiliser les classes existantes de `styles.css` (cartes, gélules, filigranes).
- Un module pur qui lit la note (séances, exercices, volume, règles), testé comme `etat.ts`.
- Rafraîchir quand la note change (comme `shouldRefresh`).
- Méthode d'Uriel : code simple, petites fonctions nommées, rien de plus que le besoin. Tests verts, build, copie dans le vault.
- À la fin : mettre à jour `_État.md` de l'Accueil (Où on en est + une case « Essayer l'onglet Entraînement dans Obsidian »).
