# Project Structure Guide

This guide documents the current project structure and the rules to follow when adding new features.

## Tech Stack

- React 19 with TypeScript
- Vite
- React Router
- TanStack Query for server state
- Redux Toolkit for app-wide client state
- Axios for HTTP requests
- Tailwind CSS for styling
- Jest and React Testing Library for tests

## Current Structure

```txt
src/
  app/
    layouts/        App-level layout components used by routes
    providers/      Global providers: Redux, Query Client, Router
    query/          TanStack Query client configuration
    router/         Route declarations and lazy page loading
    store/          App-wide Redux store, slices, and typed hooks

  features/
    home/           Example feature module
      api/          Feature-specific API hooks and queries
      pages/        Route-level pages
      components/   components for page 
      index.ts      Public exports for the feature

  shared/
    api/            Shared API client and API error helpers
    config/         Shared app configuration and env access
    ui/             Reusable UI components with no feature-specific logic

  test/
    mocks/          Test mocks
    setupTests.ts   Jest setup
    renderWithProviders.tsx
                   Test renderer with Redux, Query Client, and Router
```

## Responsibility Rules

### `src/app`

Use `app` only for application-level setup:

- `app/providers`: add or compose global providers.
- `app/router`: register routes and lazy-loaded pages.
- `app/layouts`: define layouts shared by route groups.
- `app/store`: keep Redux store setup, typed hooks, and truly app-wide slices.
- `app/query`: configure the shared TanStack Query client.

Do not put feature-specific UI, API calls, or business logic in `app`.

### `src/features`

Each product feature should live in its own folder:

```txt
src/features/<feature-name>/
  api/              Server calls, query hooks, mutation hooks
  components/       Components used only by this feature
  hooks/            Hooks used only by this feature
  pages/            Route-level pages for this feature
  store/            Optional feature-only state helpers
  types.ts          Optional feature-specific types
  index.ts          Public exports used by routes or other modules
```

Only create folders that are needed. Keep feature internals private by default and expose only the intended public surface through `index.ts`.

### `src/shared`

Use `shared` for reusable code that has no dependency on a specific feature:

- API client and common API helpers
- environment/config helpers
- generic UI components
- shared utilities, constants, and types

If a component or helper knows about one business feature, keep it inside that feature instead of moving it to `shared`.

### `src/test`

Use `renderWithProviders` when testing components that need Redux, TanStack Query, or routing. Prefer colocated test files beside the unit being tested:

```txt
Component.tsx
Component.test.tsx
```

## Import Rules

- Use the `@` alias for imports from `src`.
- Prefer importing feature pages from the feature public API.
- Avoid deep imports across feature boundaries.

Good:

```ts
import { HomePage } from '@/features/home'
import { apiClient } from '@/shared/api'
```

Avoid:

```ts
import { HomePage } from '@/features/home/pages/HomePage'
```

Deep imports are fine inside the same feature.

## Adding A New Feature

Example: adding a `profile` feature.

### 1. Create the feature folder

```txt
src/features/profile/
  api/
    useProfileQuery.ts
  pages/
    ProfilePage.tsx
    ProfilePage.test.tsx
  index.ts
```

### 2. Export the route page

```ts
// src/features/profile/index.ts
export { ProfilePage } from './pages/ProfilePage'
```

### 3. Register the route

Add a lazy import in `src/app/router/AppRoutes.tsx`:

```tsx
const ProfilePage = lazy(() =>
  import('@/features/profile').then((module) => ({
    default: module.ProfilePage,
  })),
)
```

Then add the route under the appropriate layout:

```tsx
<Route path="profile" element={<ProfilePage />} />
```

### 4. Add API hooks inside the feature

Use the shared API client and TanStack Query:

```ts
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/shared/api'

type Profile = {
  id: string
  name: string
}

async function getProfile() {
  const response = await apiClient.get<Profile>('/profile')
  return response.data
}

export function useProfileQuery() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  })
}
```

### 5. Add tests

Use `renderWithProviders` for page/component tests that depend on app providers:

```tsx
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ProfilePage } from './ProfilePage'

test('renders profile page', () => {
  renderWithProviders(<ProfilePage />)

  expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
})
```

## State Management Rules

- Use local component state for UI state used by one component.
- Use feature-local hooks/context only when state is shared inside one feature.
- Use Redux only for app-wide client state that multiple unrelated features need.
- Use TanStack Query for server state, caching, loading, and refetching.
- Do not copy server data from TanStack Query into Redux unless there is a clear reason.

## API Rules

- Use `apiClient` from `src/shared/api`.
- Keep endpoint functions and query/mutation hooks close to the feature that owns them.
- Shared API error normalization should stay in `src/shared/api/apiError.ts`.
- Environment values should be read from `src/shared/config/env.ts`, not directly across the app.

## Styling Rules

- Use Tailwind utility classes in components.
- Keep reusable UI primitives in `src/shared/ui`.
- Keep feature-specific UI components inside `src/features/<feature-name>/components`.
- Do not move a component to `shared` until at least two features need it.

## Naming Conventions

- Components and pages: `PascalCase.tsx`
- Hooks: `useSomething.ts`
- Redux slices: `somethingSlice.ts`
- Tests: `*.test.ts` or `*.test.tsx`
- Feature folders: lowercase kebab-case if the name has multiple words

## Checklist Before Finishing A Feature

- Feature code is inside `src/features/<feature-name>`.
- Route page is exported from the feature `index.ts`.
- Route is registered in `src/app/router/AppRoutes.tsx`.
- API calls use `apiClient`.
- Server state uses TanStack Query.
- App-wide client state uses typed Redux hooks from `src/app/store/hooks.ts`.
- Tests cover the main render path and important user behavior.
- `pnpm lint`, `pnpm test`, and `pnpm build` pass.

