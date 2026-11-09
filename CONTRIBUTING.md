# Contribuer au prototype

## Principes

1. Utiliser une branche dédiée aux changements.
2. Garder les ressources 3D et images tant que leur usage n'a pas été vérifié.
3. Modifier les chemins d'assets et leurs références dans le même changement.
4. Garder les composants d'interface dans `src/components/` et la logique Three.js dans `src/game/`.
5. Vérifier le projet avant de proposer une fusion.

## Vérifications

```bash
bun run lint
bun run build
```

## Ressources volumineuses

Les modèles 3D et animations peuvent peser plusieurs mégaoctets. Avant d'ajouter une nouvelle version, vérifier si une copie existe déjà dans `public/models/` ou ailleurs dans le dépôt.
