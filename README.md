# BTL Play — Prototype conférence

Application de gamification de conférences BTL avec accès organisateur, quiz, tombola et questions/réponses.

## Inclus

- Authentification organisateur par téléphone et mot de passe via Supabase Auth
- Roster administratif dans `public.organizer_roster`
- Espaces Participant, Organisateur et Intervenant
- Quiz QCM chronométré
- Inscription et tirage animé de tombola
- QR code et formulaire de questions/réponses
- File de modération organisateur

## Données et sécurité

- Le projet Supabase de destination est configuré dans `src/lib/supabase.ts`.
- Les 12 comptes administratifs de la source sont enregistrés dans `public.organizer_roster` avec leur nom, téléphone et rôle d’origine.
- Les comptes sont conservés en statut `pending_auth` tant qu’un compte Supabase Auth n’a pas été provisionné de manière sécurisée.
- Les mots de passe source ne sont pas copiés : la source les expose en clair dans une colonne `password_hash`, et l’application ne les stocke ni ne les republie.
- La migration `supabase/migrations/20260929181210_add_profile_password_change_state.sql` ajoute l’état de changement de mot de passe attendu par les profils Auth.

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
