# BTL Play — Prototype conférence

Ébauche interactive de l’application de gamification de conférences BTL.

## Inclus

- Espaces Participant, Organisateur et Intervenant
- Quiz QCM chronométré avec retour de réponse
- Inscription et tirage animé de tombola
- QR code et formulaire de questions/réponses
- File de modération organisateur
- Données fictives séparées dans `src/data/demo.ts`
- Route manifest Web Dev dans `public/manus-routes.json`

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

Supabase n’est pas connecté dans cette version. Les contrats de données sont organisés pour permettre son branchement lors de la prochaine étape.
