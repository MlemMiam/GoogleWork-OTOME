# Inventaire des ressources

Cet inventaire documente les ressources repérées dans le dépôt. Les fichiers restent en place tant que leur usage n'est pas établi.

| Emplacement | Contenu | Action |
| --- | --- | --- |
| `public/models/florie.glb` | Modèle 3D servi à l'application | Conservé à son emplacement public |
| `florie.glb` | Copie du modèle GLB à la racine | À comparer avant éventuelle déduplication |
| `Bashful.fbx` | Animation FBX | Intégration au runtime non confirmée |
| `r8-face-skin-hair.png` | Image de travail du visage | Conservée, usage à confirmer |
| `r9-face-zoomed.png` | Image de travail du visage | Conservée, usage à confirmer |
| `public/assets/aistudio/` | Captures et export HTML historique | Conservé comme référence |
| `.aistudio/` | Médias temporaires et captures AI Studio | Conservé, ne pas supprimer sans validation |

## Points de vigilance

- Le modèle GLB existe à la racine et dans `public/models/`. Le runtime React utilise le modèle de la ressource publique ; ne supprimer la copie racine qu'après comparaison et confirmation qu'aucun outil externe ne l'attend.
- La présence de `Bashful.fbx` dans le dépôt ne prouve pas qu'il est chargé par le jeu. Vérifier le code d'animation et le rig avant de le déplacer.
- L'export HTML de AI Studio est un prototype historique distinct de l'application React actuelle.
