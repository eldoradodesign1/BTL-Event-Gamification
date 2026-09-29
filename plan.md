# Plan d’implémentation — BTL Play

## Objectif
Livrer une ébauche frontend responsive et interactive de l’application de gamification de conférences BTL, en français, avec données fictives uniquement et une séparation claire entre modèles de données et logique d’interface afin de préparer une future connexion Supabase.

## Décisions d’architecture
- **Frontend** : React + TypeScript + Vite, projet flexible initialisé sans backend géré.
- **Rendu** : SPA/CSR ; le contenu actuel est interactif mais les données sont locales. Cela évite de surdimensionner le prototype et permet d’ajouter plus tard des appels Supabase sans migrer le shell UI.
- **Données** : `src/data/demo.ts` contient les types et fixtures fictives ; `App.tsx` gère uniquement l’état de démonstration et les interactions. La future couche Supabase pourra implémenter les mêmes contrats.
- **Navigation** : routes SPA simples et explicites : `/`, `/participant`, `/organisateur`, `/intervenant`, avec redirection visuelle via le sélecteur de rôle.
- **Route manifest** : `public/manus-routes.json` déclare l’ensemble des routes applicatives.
- **Déploiement futur** : publication statique de `dist` avec fallback SPA. Les appels Supabase futurs resteront côté navigateur via une couche dédiée ou seront ajoutés via un backend si une contrainte de sécurité l’impose. Aucun service managé n’est activé maintenant car cette itération est explicitement fictive.

## Structure cible
- `index.html` : document HTML, meta et chargement des polices.
- `src/main.tsx` : montage React.
- `src/App.tsx` : shell, navigation, vues de rôle et état interactif de la démo.
- `src/data/demo.ts` : types métier et jeux de données fictifs.
- `src/index.css` : tokens, layout responsive, composants visuels, animations et accessibilité.
- `public/manus-routes.json` : contrat de routes Web Dev.
- `public/btl-play-icon.svg` et `public/btl-play-mark.svg` : identité visuelle et favicon de la démo.
- `app.config.ts` : métadonnée de logo du projet Web Dev.

## Parcours livrés
1. Landing courte qui permet de choisir un rôle de démonstration.
2. Participant : hero de session, cartes quiz/tombola/Q&R, quiz chronométré interactif, inscription tombola, formulaire question avec intervenant et QR code.
3. Organisateur : métriques, statut session, lancement quiz, vue tombola, file de modération Q&R.
4. Intervenant : file de questions filtrée par intervenant et actions de préparation.
5. Navigation responsive desktop/mobile avec état actif.

## Vérification
- Vérifier `/manus-routes.json` en HTTP 200 et JSON conforme.
- Enregistrer les diagnostics TypeScript via `webdev.config` puis exécuter `pnpm check`.
- Exécuter `pnpm build`.
- Vérifier la disponibilité HTTP de la preview sur le port configuré.
