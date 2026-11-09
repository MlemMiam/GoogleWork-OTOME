# Florie à East High

Prototype de jeu 3D interactif dans lequel Florie explore le lycée East High à la troisième personne.

## Démarrer le projet

Prérequis : Node.js et npm (ou Bun).

```bash
npm.cmd run dev
```

Vite démarre le serveur de développement sur le port **3000**.

## Vérifications

```bash
npm run lint
npm run build
```

- `npm run lint` lance TypeScript sans générer de fichiers.
- `npm run build` produit la version de production dans `dist/`.
- `npm run preview` permet de prévisualiser le build.
- Aucun script de test global n'est actuellement déclaré dans `package.json`.

## Commandes utiles

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Lancer le serveur Vite |
| `npm run lint` | Vérifier les types TypeScript |
| `npm run build` | Construire l'application |
| `npm run preview` | Prévisualiser le build |
| `npm run clean` | Supprimer `dist/` et `server.js` |

## Organisation du code

- `src/App.tsx` : point d'entrée de l'expérience, boucle de rendu, contrôles et HUD.
- `src/components/` : composants d'interface React (menus, commandes, mini-carte).
- `src/game/` : logique Three.js, personnage, environnement, physique, audio, textures générées et animations d'idle procédurales (idle douce + idle timide aléatoire).
- `public/models/` : modèles 3D servis tels quels par Vite.
- `public/assets/` : ressources statiques et captures du projet.
- `.aistudio/` : fichiers de travail et médias conservés depuis AI Studio.
- `docs/` : documentation du dépôt.

Voir [l'arborescence détaillée](docs/PROJECT-STRUCTURE.md) et [l'inventaire des ressources](docs/ASSET-INVENTORY.md).

## Ressources et fichiers de configuration

- Ne jamais committer de vraie clé API ou de fichier `.env`. Le fichier `.env.example` sert de modèle.
- Les fichiers de `public/` sont accessibles par URL à l'exécution ; vérifier les chemins avant tout déplacement.
- Certains fichiers à la racine sont conservés pour compatibilité ou parce que leurs références ne sont pas encore établies. Leur inventaire explique leur statut.

## État du prototype

Le projet utilise React, TypeScript, Vite et Three.js. Le personnage dispose d'un modèle GLB, d'un modèle procédural de secours et d'animations pilotées par la logique du jeu. Le prototype comprend une scène extérieure/intérieure, une caméra à la troisième personne, des collisions, des contrôles clavier/souris et des commandes tactiles.
