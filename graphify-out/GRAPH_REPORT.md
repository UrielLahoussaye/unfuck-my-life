# Graph Report - .  (2026-11-02)

## Corpus Check
- 30 files · ~33,904 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 344 nodes · 508 edges · 41 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]

## God Nodes (most connected - your core abstractions)
1. `rendre()` - 20 edges
2. `AccueilView` - 15 edges
3. `ligneObjectif()` - 11 edges
4. `OngletAccueil` - 10 edges
5. `OngletPlan` - 10 edges
6. `render()` - 8 edges
7. `SouvenirModal` - 8 edges
8. `iso()` - 7 edges
9. `OngletEntrainement` - 7 edges
10. `buildHome()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `rendre()` --calls--> `parseLog()`  [EXTRACTED]
  main.js → main.js  _Bridges community 30 → community 2_
- `display()` --calls--> `buildHome()`  [EXTRACTED]
  main.js → main.js  _Bridges community 16 → community 9_
- `rendre()` --calls--> `quotidien()`  [EXTRACTED]
  main.js → main.js  _Bridges community 16 → community 2_
- `ajouterJalon()` --calls--> `find()`  [EXTRACTED]
  main.js → main.js  _Bridges community 16 → community 25_
- `palier()` --calls--> `find()`  [EXTRACTED]
  main.js → main.js  _Bridges community 16 → community 7_

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (2): nearestEtats(), sousProjets()

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (26): ajouterJalon(), aujourdhui(), basculer(), bornes(), champ(), chiffre(), commeCible(), ecartMois() (+18 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (24): addToVision(), arrow(), background(), button(), card(), domaines(), fenetre(), ligneDeFrise() (+16 more)

### Community 3 - "Community 3"
Cohesion: 0.16
Nodes (8): buildHome(), find(), links(), nearestEtats(), numberedChildren(), quotidien(), sortLinks(), sousProjets()

### Community 4 - "Community 4"
Cohesion: 0.17
Nodes (1): AccueilView

### Community 5 - "Community 5"
Cohesion: 0.26
Nodes (3): moisAn(), OngletPlan, pct()

### Community 6 - "Community 6"
Cohesion: 0.17
Nodes (12): ajouterRecettes(), deriver(), euros(), interroger(), jetonShopify(), json(), lireMesures(), ouvrir() (+4 more)

### Community 7 - "Community 7"
Cohesion: 0.26
Nodes (12): bornes(), chiffre(), commeCible(), dateCourte(), ecart(), evaluer(), ligneObjectif(), mesurer() (+4 more)

### Community 8 - "Community 8"
Cohesion: 0.29
Nodes (2): OngletAccueil, today()

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (11): connecteurs(), date(), display(), draw(), header(), onOpen(), refresh(), render() (+3 more)

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (7): interroger(), jetonShopify(), json(), lireMesures(), remplir(), shopify(), suivre()

### Community 11 - "Community 11"
Cohesion: 0.27
Nodes (5): addLogRow(), jourLog(), logBounds(), parseLog(), prochaineSeance()

### Community 12 - "Community 12"
Cohesion: 0.24
Nodes (2): AffirmationModal, OngletVision

### Community 13 - "Community 13"
Cohesion: 0.25
Nodes (1): AccueilSettingTab

### Community 14 - "Community 14"
Cohesion: 0.31
Nodes (1): SouvenirModal

### Community 15 - "Community 15"
Cohesion: 0.28
Nodes (2): champ(), OngletEntrainement

### Community 16 - "Community 16"
Cohesion: 0.29
Nodes (8): buildHome(), find(), numberedChildren(), openFolder(), openPath(), quotidien(), reveal(), splitEmoji()

### Community 17 - "Community 17"
Cohesion: 0.29
Nodes (2): checkTask(), cocher()

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (1): JalonModal

### Community 19 - "Community 19"
Cohesion: 0.57
Nodes (6): ajouterRecettes(), deriver(), euros(), octets(), ouvrir(), verifier()

### Community 20 - "Community 20"
Cohesion: 0.33
Nodes (1): ImageSuggest

### Community 21 - "Community 21"
Cohesion: 0.4
Nodes (1): AccueilPlugin

### Community 22 - "Community 22"
Cohesion: 0.33
Nodes (1): TacheModal

### Community 23 - "Community 23"
Cohesion: 0.67
Nodes (5): bien(), dir(), etat(), note(), vault()

### Community 24 - "Community 24"
Cohesion: 0.4
Nodes (5): basculer(), checkTask(), cocher(), decocher(), lireLigne()

### Community 25 - "Community 25"
Cohesion: 0.5
Nodes (5): ajouterJalon(), champ(), entete(), parsePlan(), projetDe()

### Community 26 - "Community 26"
Cohesion: 0.5
Nodes (4): free(), memoraName(), onClose(), save()

### Community 27 - "Community 27"
Cohesion: 0.5
Nodes (4): champ2(), enHaut(), noter(), resume()

### Community 28 - "Community 28"
Cohesion: 0.67
Nodes (2): nodes(), parseVision()

### Community 29 - "Community 29"
Cohesion: 0.5
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 0.67
Nodes (3): addLogRow(), logBounds(), parseLog()

### Community 31 - "Community 31"
Cohesion: 0.67
Nodes (3): extractTasks(), paquet(), sansRelance()

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 32`** (2 nodes): `memoraName()`, `memora.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (2 nodes): `vaultTree.ts`, `toTree()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (2 nodes): `lire()`, `connecteurs.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (2 nodes): `ligne()`, `entrainement.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (2 nodes): `app()`, `recettes.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (2 nodes): `vision.test.ts`, `canvas()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `etat.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `plan.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `souvenir.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `rendre()` connect `Community 2` to `Community 0`, `Community 7`, `Community 9`, `Community 16`, `Community 30`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._