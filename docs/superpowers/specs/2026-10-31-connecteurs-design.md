# Connecteurs de métriques et paliers — design

> Plugin Accueil, page Timeline. 31/10/2026. Statut : à valider par Uriel.
> But : chaque objectif d'un plan montre où on en est face à sa cible du moment, sans recopier un chiffre dans le vault.

## Ce que voit Uriel

La carte d'un objectif : le chiffre atteint en grand (Aboreto), « sur 6 000 € ce mois-ci » en petit, une barre, et la cible finale en bas (« 10 000 € en avril »). Pas de source : la carte reste comme aujourd'hui. Source en erreur : le chiffre devient « — » et une ligne grise dit pourquoi (« Shopify : jeton refusé »).

## Le format, dans la note du plan (chiffres d'exemple)

```
- [ ] CA par mois, boutique et festivals : 10 000 € 📅 2027-04-30 [mesure:: boutique.ca + fellowship.ca] [depart:: 4 000 €]
	- déc. : 12 000 €
- [ ] Activations ÷ ventes du week-end : 30 % [mesure:: hub.activations / hub.ventes_stand]
```

- `[mesure:: …]` : une ou plusieurs mesures `connecteur.mesure`, reliées par `+` ou `/`. Une cible en `%` affiche le quotient en pourcentage.
- La période suit le nom ou l'unité : « par mois » → le mois en cours, « par semaine », « par week-end » → les sept derniers jours ; sinon, depuis le début du plan. `[periode:: mois|semaine|plan]` force le choix.
- **Paliers** : `[depart:: …]` est la valeur du premier mois ; la cible monte en ligne droite, mois après mois, jusqu'à la cible finale à l'échéance. Une sous-ligne `- déc. : 12 000 €` fixe un mois à la main. Sans départ, une seule cible.

Champs inline au format Dataview : lisibles dans Obsidian sans le plugin, ignorés par Tasks.

## Les connecteurs, génériques

Dans les réglages du plugin, une section « Connecteurs » : une liste, « + Ajouter ». Chacun a un **identifiant** court (`boutique`, `fellowship`, `hub`), un **type**, sa configuration et ses mesures. Les clés vont dans le coffre d'Obsidian (`app.secretStorage`, gardé sur l'appareil, hors du `data.json` synchronisé) ; le réglage ne garde que le nom du secret.

Deux types en v1 :

1. **Shopify** : domaine `*.myshopify.com` et jeton Admin (lecture des commandes). Mesures fournies : `ca` (somme des commandes payées, remboursements déduits), `commandes`. API GraphQL Admin, période en `created_at`.
2. **Requête JSON** : tout le reste. URL, méthode GET ou POST, un en-tête d'autorisation tiré d'un secret, un corps facultatif ; `{debut}` et `{fin}` (AAAA-MM-JJ) remplacés dans l'URL et le corps ; chaque mesure = un nom et un chemin dans la réponse (`data.ca`, `0.total`). Une fonction Supabase (RPC), une feuille Google publiée, une API maison : tout passe par là.

Un acheteur du plugin branche sa boutique Shopify et n'importe quelle API qui rend du JSON, sans code.

## Nos sources à nous

- **boutique** — Shopify, `ca` et `commandes`.
- **fellowship** — Requête JSON vers une RPC `mes_metriques(debut, fin)` à créer dans Fellowship, appelée avec le jeton personnel de l'exposant : `ca` (lignes « ventes » du registre des bilans) et `ca_projete`. Fellowship y gagne une fonction vendable : « branche ton tableau de bord ».
- **hub** — Requête JSON vers une RPC du Hub, réservée à l'admin : `scans`, `activations`, `ventes_stand`, `inscriptions_stand`.

Les deux RPC sont du code dans les dépôts de l'appli et de Fellowship : migrations à déployer depuis le PC (Remote Control) ou par GitHub, avec l'accord d'Uriel.

## Quand ça se lit

À l'ouverture de l'onglet Timeline, puis au plus une fois toutes les quinze minutes ; un bouton ↻ discret force la relecture. Les valeurs restent en mémoire, jamais écrites dans le vault (règle du Socle : aucun chiffre vivant dans le vault).

## Écarté

- Les clés dans les réglages du plugin : elles finiraient dans le vault synchronisé et sur le téléphone.
- Une fonction serveur unique dans le Supabase de Runes de Chêne : rien de générique, un acheteur n'en aurait pas.
- Un chiffre seul, sans cible (le mod « pouls » du 18/10) : la carte ne montre l'atteint que face au palier.

## Ordre

1. Paliers (aucun réseau) : la carte montre la cible du mois.
2. Connecteurs et réglages, type Requête JSON puis Shopify.
3. RPC Fellowship, puis RPC du Hub, déployées avec Uriel.
