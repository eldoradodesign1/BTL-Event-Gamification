# BTL Live — Prototype conférence

Prototype de gamification de conférences BTL avec quatre accès : **participant**, **intervenant**, **organisateur** et **écran / projection**.

## Parcours inclus

- **Participant** : inscription par QR d’entrée avec nom et photo facultative, compte éphémère lié à l’Event, quiz chronométré, inscription à la tombola et questions/réponses par QR.
- **Intervenant** : accès lié à l’Event, questions validées destinées à l’intervenant, mise à l’antenne et espace **Slides** pour renseigner un PPTX et piloter un deck slide par slide.
- **Organisateur** : connexion par téléphone/mot de passe via Supabase Auth, tableau de bord, participants, intervenants, statistiques, quiz, tombola, modération Q/R et suivi du deck scène.
- **Écran** : vues projection quiz, tombola, Q/R et slides ; QR en grand pour rejoindre l’activité ; synchronisation d’affichage toutes les 5 secondes ; question à l’antenne avec photo du participant ; tirage animé avec bouton de lancement et confettis.

## Données de démonstration

Le prototype utilise des données fictives et synchronise les onglets via `BroadcastChannel` + `localStorage`. La couche `BTL.store` est conçue pour être remplacée par Supabase Database/Realtime sans réécrire les vues.

Les participants sont marqués avec une durée de conservation de démonstration de 2 jours. Les intervenants et le deck sont attachés à l’Event et affichent une date d’expiration / un état de fichier pour préparer la future gestion Supabase.

## Authentification organisateur

- La connexion organisateur se déclenche uniquement sur `#/admin` et `#/admin/*`.
- Les participants, intervenants et écrans ne sont pas bloqués par cette garde dans le prototype.
- Le projet Supabase de destination est configuré dans `public/boot.js` avec un accès Auth téléphone/mot de passe et une vérification de `public.organizer_roster`.
- Les 12 comptes administratifs actifs restent gérés dans Supabase ; aucun mot de passe n’est stocké dans ce dépôt.

## Lancer le projet

```bash
pnpm install
pnpm dev
```

Puis ouvrir `http://localhost:3000`.

## Vérifications

```bash
pnpm check
pnpm build --mode github-pages
```

Le build GitHub Pages utilise le mode `github-pages` et le chemin `/BTL-Event-Gamification/`.
