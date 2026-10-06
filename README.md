# BTL Play — Prototype conférence

Application de gamification de conférences BTL avec accès organisateur, quiz, tombola et questions/réponses.

## Inclus

- Authentification organisateur par numéro de téléphone et mot de passe via Supabase Auth
- 12 comptes administratifs actifs : `admin`, `sub_admin`, `super_admin` et `supervisor`
- Espaces Participant, Organisateur et Intervenant
- Quiz QCM chronométré
- Inscription et tirage animé de tombola
- QR code et formulaire de questions/réponses
- File de modération organisateur

## Données et authentification

- Le projet Supabase de destination est configuré dans `src/lib/supabase.ts` et `public/boot.js`.
- Les 12 administratifs de la source sont enregistrés dans `public.organizer_roster` avec leur nom, téléphone et rôle d’origine.
- Les 12 comptes existent dans Supabase Auth, leurs profils sont actifs et leur roster est en statut `active`.
- L’authentification téléphone par mot de passe est activée dans Supabase ; aucun fournisseur SMS n’est nécessaire pour ce parcours.
- Les mots de passe existants ont été importés côté serveur sous forme de hash bcrypt dans Supabase Auth. Ils ne sont pas exposés dans le frontend, le dépôt ou les logs.
- Les numéros doivent être saisis au format international, par exemple `+243821000008`.

La migration `supabase/migrations/20260929181210_add_profile_password_change_state.sql` ajoute l’état de changement de mot de passe attendu par les profils Auth.

Les contenus de conférence (questions, participants, intervenants et tombola) restent des données de démonstration dans `src/data/demo.ts` jusqu’au branchement des tables métier.

## Lancer le projet

```bash
pnpm install
pnpm dev
```

Puis ouvrir `http://localhost:3000`.

## Vérifications

```bash
pnpm check
pnpm build
```
