# Migration Notes

## Current status

- Custom try-on page is currently disabled from the visible UI.
- The embedded 123 files are still kept under `public/embedded/custom-tryon-123/` for later re-enable or direct integration.
- `npm start` remains unchanged.

## Active runtime structure

- `server.js`: root startup bridge, requires `src/server/index.js`.
- `src/server/index.js`: creates the server from handlers and listens on `PORT`.
- `src/server/handlers.js`: contains the preserved original backend implementation and static serving logic.
- `public/index.html`: active HTML entry.
- `public/client/main.js`: active frontend behavior entry.
- `public/client/styles/main.css`: CSS import entry.
- `public/client/styles/pages.css`: copied original CSS implementation.

## What was removed from UI

- Removed the `自定义试戴` tab.
- Removed the `#tryon` iframe section.
- Removed the dialog button that navigated to `data-page-target="tryon"`.

## Compatibility kept

- Existing API paths remain unchanged.
- `/outputs/*` and `/uploads/*` remain served from project root.
- `/_next/*`, `/demo/*`, and `/style-library/*` still map to embedded 123 resources if that page is re-enabled.

## Next extraction order

1. Move DOM selectors from `public/client/main.js` to `public/client/dom.js`.
2. Move pure helpers to `public/client/utils.js`.
3. Move fetch wrappers to `public/client/api.js`.
4. Move catalog functions to `public/client/modules/catalog.js`.
5. Move batch try-on functions to `public/client/modules/tryon.js`.
6. Move recommendation chat functions to `public/client/modules/recommend.js`.
7. Move records rendering to `public/client/modules/records.js`.
8. Move route dispatch from `src/server/handlers.js` to `src/server/routes.js` once endpoint tests are added.
