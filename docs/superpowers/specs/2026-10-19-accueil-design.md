# Accueil — la page d'accueil du vault Mon Cerveau

*Design validé dans la conversation du 19/10/2026. Maquette : Figma `NQs5DPaRjTEJhtu5cmJsX1`,
frame « Accueil v2 — Mon Cerveau (1440) » (node `6:71`).*

## Pourquoi

Uriel ouvre son vault Obsidian et doit pouvoir aller vite, et visuellement, vers un de ses
métiers ou de ses domaines — et voir d'un coup d'œil ce qui attend sur chaque métier. L'explorateur
de fichiers ne donne ni la hiérarchie (ce qui rapporte d'abord) ni l'état.

## Ce que c'est

Un plugin Obsidian, pour PC (desktop), qui affiche une page d'accueil dans un onglet du vault.
Il ne crée ni ne modifie aucune note : il lit la structure du vault et les `_État.md`.

## Accès

- Au démarrage d'Obsidian, l'accueil s'ouvre.
- Une icône dans la barre latérale gauche (ribbon) ouvre l'accueil, ou le ramène au premier plan
  s'il est déjà ouvert (jamais deux onglets d'accueil).
- Une commande « Ouvrir l'accueil » dans la palette, à laquelle Uriel peut lier un raccourci.
- Pas de bouton dans l'explorateur de fichiers : Obsidian ne l'expose pas, ce serait fragile.

## Contenu

### En-tête

La date du jour en petites capitales, le titre « Mon Cerveau. » en très grand (le point en rouge),
et à droite un champ « Où veux-tu aller ? » qui ouvre le sélecteur rapide de notes d'Obsidian
(Ctrl O) — pas de moteur de recherche maison.

### Le Métier (en haut)

- **Une carte par sous-dossier numéroté de `1. LE MÉTIER/`**, dans l'ordre de leur numéro.
- **Le numéro fixe la taille** : 1 → grande carte (gauche, toute la hauteur) ; 2 → carte large
  (à droite, en haut) ; 3 et suivants → petites cartes (à droite, en bas, côte à côte). Changer la
  hiérarchie = renommer les dossiers ; aucune option de réglage.
- Titre de la carte = nom du dossier sans son numéro (« 3. Bilskirnir » → « Bilskirnir »).
  Chiffre romain du numéro en petit en haut à gauche et en filigrane géant, rouge très transparent.
- **Prochaine action**, lue dans le `_État.md` du dossier :
  - section `## Prochaine action` (jusqu'au titre `##` suivant) ;
  - on prend le **premier passage en gras** (`**…**`) de la section, coupé avant la première
    parenthèse ou le premier deux-points ; s'il n'y a pas de gras, la première ligne non vide ;
  - **une seule ligne**, points de suspension si ça déborde ;
  - « · +N » à la suite quand N autres paragraphes de la section commencent par du gras ;
  - s'il n'y a pas de `_État.md` ou pas de section, la ligne n'apparaît pas.
- **Sous-projets** : quand le dossier contient un sous-dossier (n'importe quelle profondeur) avec
  son propre `_État.md`, sa prochaine action s'affiche en seconde ligne, en gris :
  « Explore — La refonte du Hub ». Uriel veut voir les deux (le projet et son sous-projet).
  *Choix de Claude* : on ne prend que les `_État.md` les plus proches (un sous-projet d'un
  sous-projet ne compte pas) ; une ligne par sous-projet, deux au plus par ordre alphabétique,
  puis « +N sous-projets » ; pas de « · +N » de paragraphes sur ces lignes.
- Clic sur une carte → ouvre son `_État.md`.
- **Accroche** (Uriel, 19/10) : une phrase facultative sous le titre des cartes **et** des colonnes
  domaines, saisie dans les **réglages du plugin**. Les réglages listent d'eux-mêmes chaque métier
  et chaque domaine trouvés dans le vault, avec un champ texte en face ; vide = pas d'accroche, la
  carte se resserre. Un dossier renommé perd son accroche (clé = chemin du dossier) — acceptable.
  C'est la seule saisie manuelle du plugin, et elle est facultative.

Valeurs constatées le 19/10/2026 avec ces règles : Runes de Chêne « Le produit d'abord » + « Explore
— La refonte du Hub » ; Fellowship « Avant la bascule de la V2 à la racine · +6 » ; Bilskirnir
« Définir le catalogue » ; IVY « Lui faire une landing page et… ».

### Au quotidien (tout en bas, sous les Domaines)

Les notes de tous les jours, plus faciles d'accès que par Inbox (Uriel, 19/10).

- **Le dossier se choisit dans les réglages du plugin** (« Dossier du quotidien », sélecteur de
  dossier du vault). Une tuile par note posée directement dans ce dossier (pas dans ses
  sous-dossiers) : Astuces glanées, Boîtes à idées, Galets blancs, Leçons apprises à la dure…
  Uriel prévoit un dossier dédié aux notes quotidiennes. Tant qu'aucun dossier n'est choisi, la
  section n'apparaît pas.
- **Ses sous-dossiers** s'affichent au-dessus des tuiles, en une rangée de gélules (mêmes gélules
  que les Domaines, mêmes règles de clic). Choisir `0. INBOX` donne Journal, Notes, Recettes, Santé
  en gélules et ses notes en tuiles.
- *Choix de Claude* : le dossier du quotidien n'apparaît pas en gélule dans la colonne de son
  domaine parent (ses notes sont déjà en bas).
- **Dossiers masqués** : une liste dans les réglages (chemins de dossiers, vide par défaut) ;
  un dossier masqué n'apparaît nulle part sur l'accueil. *Choix de Claude*, pour coller à la
  maquette validée par Uriel le 19/10, qui ne montre pas `SOUVENIRS` — il l'y ajoutera lui-même.
- Tuile : l'emoji en tête du nom à gauche (en plus grand), le nom sans l'emoji à droite ; fond de
  carte, bordure fine, coins ~8 px ; grille qui passe à la ligne (7 par ligne en 1440). Même
  survol que les gélules (rouge), clic → ouvre la note.
- Ordre alphabétique, sans tenir compte de l'emoji. Pas de plafond : toutes les notes s'affichent.
- Les sections sont numérotées I Le Métier, II Les Domaines, III Au quotidien.

### Les Domaines (en bas)

- **Une colonne par dossier racine numéroté autre que `0.` et `1.`** (aujourd'hui
  `2. LA HOUSSAYE`, `3. L'ATELIER`, `4. L'ŒUVRE`), dans l'ordre du numéro. Le `0.` est la boîte de
  capture, pas un domaine (Uriel, 19/10) : ce qui y sert tous les jours passe par « Au quotidien ».
- **Jamais sur l'accueil** : `_Socle` (il ne parle que d'Uriel, ce n'est pas un domaine),
  `_archives`, `_System`, et tout dossier sans numéro (SÉNAQUE…). Un dossier sans numéro ne se
  pilote pas.
- Colonne : numéro en rouge, flèche d'ouverture, nom du domaine, un petit filet rouge, puis ses
  enfants directs (sous-dossiers et notes) en **gélules** (Uriel, 19/10) : bordure fine, coins
  légèrement arrondis (~5 px), qui passent à la ligne. **Au survol**, la gélule passe en rouge
  (bordure rouge, fond rouge très transparent) et le curseur devient une main ; un clic ouvre.
  *Choix de Claude* : seulement les dossiers, les notes `.md` et les `.canvas` (pas d'images ni de
  PDF) ; rien qui commence par `_` ou `.` (donc ni `_État.md` ni dossier technique) ; les dossiers
  d'abord puis les notes, chacun par ordre alphabétique ; l'emoji en tête du nom est gardé tel quel ;
  au plus 12 gélules, puis une gélule « +N » en pointillés qui révèle
  le domaine dans l'explorateur. `0. INBOX/SOUVENIRS` apparaît comme un lien ordinaire : la zone est
  interdite à Claude, pas à Uriel, et le plugin ne fait qu'en afficher le nom.
- **Disposition horizontale** : les colonnes côte à côte (5 sur grand écran) et passent à la ligne
  quand la place manque (4, 3, 2, 1 colonnes).
- Clic sur un lien de note → ouvre la note. Clic sur un lien de sous-dossier → ouvre son
  `_État.md` s'il en a un, sinon la note principale du dossier si elle se reconnaît (note qui porte
  le nom du dossier, emoji compris ou non), sinon révèle le dossier dans l'explorateur.

### Mise en page générale

Le bloc des métiers suit aussi la largeur : quand elle manque, la grande carte passe au-dessus et
les autres se rangent dessous. La page doit rester belle dans l'onglet d'Obsidian avec la barre
latérale ouverte (~1100 px), pas seulement en 1440.

## Style

Celui du vault (lu dans `.obsidian/appearance.json`) : police d'interface **Alata**, police de
texte **Amethysta**, accent **`#bd4747`**, fonds gris-bleu sombres. Le plugin utilise les
variables CSS du thème d'Obsidian là où elles existent, pour rester juste si Uriel change de thème ;
la maquette fait référence pour tout le reste (filigranes, lueur rouge en haut à gauche, dégradé
rouge sombre de la grande carte, filets fins, flèches cerclées).

## Ce qui ne doit pas arriver (anti-objectifs)

- Une page qui « fait IA » : grille de cartes uniformes, accents dorés, décor générique. Uriel l'a
  refusée explicitement ; la maquette v2 est la référence.
- Un réglage à tenir à jour à la main : tout se déduit des dossiers. Uriel ne tient rien à jour
  lui-même. Seule exception, voulue : les accroches, facultatives.
- Toucher au contenu du vault (aucune écriture). Seule exception, demandée par Uriel le 19/10 :
  importer une image de fond depuis l'ordinateur, copiée dans le dossier des pièces jointes
  d'Obsidian.
- Une page lente : l'accueil doit s'afficher instantanément au démarrage.

## Contraintes

- Desktop seulement (le portable n'est pas visé).
- Le code vit dans `C:\Users\uriel\Desktop\DEVs\Plugin\`. Le plugin s'installe dans
  `.obsidian/plugins/<id>/` du vault (copie de `main.js`, `manifest.json`, `styles.css`).
- Le vault est la copie Obsidian Sync locale `C:\Users\uriel\Desktop\MON CERVEAU (SYNC)`.
- **Zones interdites à Claude** (règle du vault) : `SÉNAQUE 2025/`, `SENAQUE Univers 2024/`,
  `4. L'ŒUVRE/`, `0. INBOX/SOUVENIRS/`. Pendant la construction et les tests, Claude ne les lit
  pas — ni avec ses outils, ni par un script. Le plugin, lui, tourne chez Uriel et affiche les noms
  des enfants de `4. L'ŒUVRE` comme ceux des autres domaines.

## Laissé au constructeur

- L'outillage (TypeScript + esbuild, gabarit officiel du plugin d'exemple Obsidian).
- L'identifiant du plugin et la façon de copier le build dans le vault.
- Les seuils exacts de passage à la ligne des colonnes.
- Le rafraîchissement quand un `_État.md` change pendant que l'accueil est ouvert.
