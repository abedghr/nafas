# Mobile app structure (feature-first)

`app/` stays **routing only** — thin screens that compose from `src/`.
All real logic lives here:

```
src/
  features/<domain>/        one folder per business domain (workout, nutrition, auth, profile)
    components/             screen-specific components
    hooks/                  react-query hooks for this domain
    api/                    typed API calls for this domain
    types.ts                domain types
  components/ui/            shared primitives reused across features
  lib/                      app-wide infra: api client, query-client, storage, i18n, features
  theme/                    colors, typography (re-exports constants/)
  api/                      base typed client + shared response types
```

## Conventions
- A screen in `app/...` imports a feature component/hook from `src/features/<domain>` and renders it. Keep screens declarative.
- Data access only through react-query hooks in `src/features/<domain>/hooks` → which call `src/features/<domain>/api` → which use the base client in `src/api`.
- No `lib/mock-data` imports in a domain once its backend feature ships.
- Import alias: `@/src/...` (the existing `@/*` → repo root alias covers it).

## Migration
Existing root-level `lib/`, `components/`, `constants/` keep working. Migrate
**per feature** as each one is built (F3 Workout is the first to move into
`src/features/workout`). No big-bang move.
