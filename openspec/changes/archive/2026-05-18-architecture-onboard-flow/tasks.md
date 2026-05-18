## 1. Backend: Generate endpoint

- [x] 1.1 Add `POST /api/architecture/generate` route in `packages/cli/src/utils/server.ts` that creates `.dc-reporter/architecture/` directory (if not exists) and writes `main.c4` with a starter template using the workspace directory basename as the system name
- [x] 1.2 Return `{ success: true }` on success, error response with 500 on filesystem failure

## 2. Frontend: i18n keys

- [x] 2.1 Add English keys to `packages/frontend/src/i18n/en.ts`: `architecture.createPrompt`, `architecture.createBtn`, `architecture.creating`, `architecture.createError`
- [x] 2.2 Add Chinese keys to `packages/frontend/src/i18n/zh-CN.ts`: `architecture.createPrompt`, `architecture.createBtn`, `architecture.creating`, `architecture.createError`

## 3. Frontend: ArchitectureView onboard UI

- [x] 3.1 Replace the static empty state message in `packages/frontend/src/components/ArchitectureView.tsx` with an onboard prompt that shows the feature description and a "Generate" button
- [x] 3.2 Add generate logic: POST to `/api/architecture/generate`, show loading state while in-flight, handle errors, on success re-trigger model load
- [x] 3.3 Disable the generate button and show a loading spinner/text while the request is in-flight

## 4. Frontend: Always-visible tab

- [x] 4.1 Remove `config?.hasArchitectureDir &&` guard from the Architecture nav button in `packages/frontend/src/App.tsx` so the tab renders unconditionally

## 5. E2E tests

- [x] 5.1 Add test: `POST /api/architecture/generate` creates directory and `main.c4` with valid C4 content
- [x] 5.2 Add test: `POST /api/architecture/generate` returns valid model on subsequent `GET /api/architecture/model`
- [x] 5.3 Add test: `GET /api/config` returns `hasArchitectureDir: true` after generation
- [x] 5.4 Update existing architecture tests if needed (e.g., config endpoint test expectations)

## 6. Verification

- [x] 6.1 Run `pnpm build` to verify all packages compile
- [x] 6.2 Run `pnpm test` to verify all tests pass
- [x] 6.3 Run `pnpm lint` to verify no linting errors
