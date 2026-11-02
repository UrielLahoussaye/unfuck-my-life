# Obsidian mobile (iPad)

- **Un `<button>` maison se cible `.accueil button.ma-classe`, jamais `.accueil .ma-classe`.**
  Obsidian tablette pose `.is-tablet button:not(.clickable-icon) { padding: 4px 20px }` (spécificité 0,2,1),
  qui bat 0,2,0 : un rond de 24 px reçoit 40 px de marge et son icône disparaît. Invisible sur PC.
- **Une colonne de grille en `fr` qui contient du texte `nowrap` se déclare `minmax(0, Nfr)`.**
  Sinon la colonne s'élargit à toute la longueur du texte et écrase sa voisine.
- **Un survol qui déplace ou entoure une grande surface se met dans `@media (hover: hover)`.**
  Au doigt, iOS l'allume dès qu'on touche la carte, et l'animation freine le défilement.
- Vérifier sur PC avant l'iPad : console d'Obsidian → `app.emulateMobile(true)`, fenêtre réduite à ~1000 px.
