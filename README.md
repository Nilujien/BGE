# BGE — ARPG 2D Multiplayer

Projet de base pour un ARPG 2D vu de haut, multijoueur temps réel, hébergé sur GitHub Pages (client statique) avec un serveur Colyseus dédié.

## Stack

- **Client** : Phaser 3 + TypeScript + Vite
- **Serveur** : Node.js + Colyseus + Express
- **Shared** : Schémas d'état `@colyseus/schema` partagés entre client et serveur
- **Déploiement** : GitHub Pages pour le client, Railway/Render/Fly.io pour le serveur

## Fonctionnalités actuelles

- Déplacement fluide du joueur (ZQSD / WASD / flèches) + **dash** (Espace)
- Caméra vue de haut avec suivi du joueur, screen-shake et flash de dégâts
- Multijoueur temps réel via WebSocket
- **4 types d'ennemis** : chasseur, coureur rapide, brute, cracheur à distance
- **Système de vagues** à difficulté croissante (PV, cadence de spawn, dégâts)
- Combat : tir maintenu au clic, multi-tirs aux hauts niveaux, dégâts de contact
- **Progression** : orbes d'XP magnétiques, niveaux (+PV, +dégâts, +projectiles), score, kills
- Mort et réapparition, régénération hors combat
- **Graphismes procéduraux** : textures générées au démarrage (aucun asset), halos additifs, particules (traînées, explosions, impacts), nombres de dégâts flottants, sol texturé, vignette
- **Sons synthétisés** WebAudio (aucun fichier audio) — touche M pour couper
- HUD complet : PV, XP/niveau, cooldown de dash, vague, classement, **minimap**
- Optimisations : throttle des inputs, patchs réseau 30/s + interpolation, distances au carré côté serveur, pooling des textes de dégâts

## Architecture réseau (optimisée pour la fluidité)

- Serveur à **60 ticks/s** avec autorité sur les positions.
- Client prédit localement les mouvements du joueur local.
- Envoi uniquement des **inputs** (direction) au serveur, pas des positions.
- Interpolation des autres joueurs et des ennemis.
- Delta-time clampé pour éviter les téléportations en cas de lag.
- Throttle des inputs côté client (50 ms) pour réduire la bande passante.

## Prérequis

- Node.js 20+
- npm 10+

## Installation

```bash
npm install
```

## Développement

### Lancement rapide (Windows)

Double-cliquer sur **`BGE-Launcher.bat`** à la racine : il installe les dépendances si besoin, démarre le serveur et le client en fenêtres réduites, puis ouvre le navigateur sur http://localhost:5173.

### Lancement manuel

Lancer le serveur :

```bash
cd server
npm run dev
```

Lancer le client :

```bash
cd client
npm run dev
```

Ouvrir http://localhost:5173.

## Build production

```bash
cd client
npm run build

cd ../server
npm run build
npm start
```

Le client est généré dans `client/dist/` et peut être déployé sur GitHub Pages.

## Contrôles

- **ZQSD / WASD** ou **flèches** : déplacer le personnage
- **Clic gauche** (maintenu) : tirer dans la direction du curseur
- **Espace** : dash (cooldown 2,2 s)
- **M** : couper / activer le son

## Structure

```
BGE/
├── BGE-Launcher.bat # Lancement local en un double-clic (Windows)
├── client/          # Jeu Phaser 3
│   ├── src/
│   │   ├── entities/    # Joueurs, ennemis, projectiles, orbes
│   │   ├── fx/          # Textures procédurales, particules, sons
│   │   ├── network/     # Gestion Colyseus côté client
│   │   ├── scenes/      # Scènes du jeu
│   │   └── ui/          # HUD et minimap
│   └── dist/            # Build statique pour GitHub Pages
├── server/          # Serveur Colyseus
│   └── src/
│       ├── rooms/       # Logique des rooms
│       └── index.ts     # Point d'entrée
└── shared/          # Schémas d'état partagés
    └── schema/
        └── GameState.ts
```

## Déploiement

1. **Client** : déployer le contenu de `client/dist` sur GitHub Pages (branche `gh-pages` ou dossier via Actions).
2. **Serveur** : déployer le dossier `server` sur Railway, Render, Fly.io ou un VPS.
3. Configurer la variable d'environnement côté client `VITE_SERVER_URL` pour pointer vers le serveur déployé.
