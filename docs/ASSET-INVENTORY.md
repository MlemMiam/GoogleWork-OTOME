# Inventaire des ressources

Cet inventaire documente les ressources reperees dans le depot. Les fichiers restent en place tant que leur usage n'est pas etabli.

| Emplacement | Contenu | Action |
| --- | --- | --- |
| `public/models/florie.glb` | Modele 3D servi a l'application | Conserve a son emplacement public |
| `public/models/bashful.fbx` | Ancienne animation d'idle, remplacee par l'idle generee | Supprimee (plus referencee par le runtime) |
| `Bashful.fbx` (racine) | Copie dupliquee de `public/models/bashful.fbx` | Supprimee (deduplication) |
| `florie.glb` (racine) | Copie dupliquee de `public/models/florie.glb` | Supprimee (deduplication) |
| `r8-face-skin-hair.png` | Image de travail du visage | Conservee, usage a confirmer |
| `r9-face-zoomed.png` | Image de travail du visage | Conservee, usage a confirmer |
| `public/assets/aistudio/` | Captures et export HTML historique | Conserve comme reference |
| `.aistudio/` | Medias temporaires et captures AI Studio | Conserve, ne pas supprimer sans validation |

## Points de vigilance

- Le modele GLB existe a la racine et dans `public/models/`. Le runtime React utilise le modele de la ressource publique ; la copie racine a ete supprimee apres comparaison (hashs identiques). L'ancien FBX d'idle n'est plus charge : l'animation d'idle est desormais generee dans `src/game/idleAnimation.ts`.
- L'export HTML de AI Studio est un prototype historique distinct de l'application React actuelle.
