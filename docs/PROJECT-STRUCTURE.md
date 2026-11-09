# Structure du projet

## Application

- `src/main.tsx` monte l'application React.
- `src/App.tsx` assemble l'interface et pilote la scène Three.js.
- `src/components/` regroupe les composants React de l'interface et des contrôles.
- `src/game/` regroupe la scène, le personnage, les collisions, l'audio, les textures et les animations d'idle générées (idle douce et idle timide déclenchée aléatoirement).

## Ressources publiques

- `public/models/` contient les modèles chargés par URL dans l'application.
- `public/assets/aistudio/` contient des captures et un export HTML historique servant de référence.

## Fichiers de travail

- `.aistudio/` conserve des médias et artefacts de travail.
- Les fichiers 3D et images encore présents à la racine sont répertoriés dans [l'inventaire des ressources](ASSET-INVENTORY.md). Ils ne doivent pas être déplacés ou supprimés avant vérification de toutes leurs références.

## Convention pour la suite

Lorsqu'une nouvelle animation est intégrée, la ranger sous `public/animations/` si elle doit être chargée à l'exécution. Garder les fichiers sources non utilisés dans un emplacement clairement documenté, sans les confondre avec les ressources effectivement chargées.
