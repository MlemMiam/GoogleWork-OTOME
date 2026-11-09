# Inventaire des ressources

Cet inventaire documente les ressources reperees dans le depot. Les fichiers restent en place tant que leur usage n'est pas etabli.

| Emplacement | Contenu | Action |
| --- | --- | --- |
| `public/models/florie.glb` | Modele 3D servi a l'application | Conserve a son emplacement public |
| `public/models/bashful.fbx` | Animation FBX chargee par le runtime | Conserve a son emplacement public |
| `Bashful.fbx` (racine) | Copie dupliquee de `public/models/bashful.fbx` | Supprimee (deduplication) |
| `florie.glb` (racine) | Copie dupliquee de `public/models/florie.glb` | Supprimee (deduplication) |
| `r8-face-skin-hair.png` | Image de travail du visage | Conservee, usage a confirmer |
| `r9-face-zoomed.png` | Image de travail du visage | Conservee, usage a confirmer |
| `public/assets/aistudio/` | Captures et export HTML historique | Conserve comme reference |
| `.aistudio/` | Medias temporaires et captures AI Studio | Conserve, ne pas supprimer sans validation |

## Points de vigilance

- Le modele GLB et le FBX existent a la racine et dans `public/models/`. Le runtime React utilise les modeles de la ressource publique ; les copies racine ont ete supprimees apres comparaison (hashs identiques).
- L'export HTML de AI Studio est un prototype historique distinct de l'application React actuelle.
