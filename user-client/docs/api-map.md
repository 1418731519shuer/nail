# API Map

All existing API paths are preserved. Current implementation remains copied in `src/server/index.js`; `src/server/routes.js`, `handlers.js`, `services.js`, `storage.js`, and `utils.js` are reserved split targets for the next mechanical extraction.

| Method | Path | Frontend caller | Request fields | Response fields |
| --- | --- | --- | --- | --- |
| POST | `/api/deepseek-chat` | recommendation chat in `public/client/main.js` | `message`, `history`, `styles`, `userMemory` | `reply`, `followUpQuestion`, `picks` |
| POST | `/api/ops-deepseek-chat` | ops assistant in `public/client/main.js` | ops message/context | ops reply payload |
| POST | `/api/tryon-generate` | custom/batch try-on in `public/client/main.js` | `styleImage`, `handImage`, `userId`, `styleId`, `styleName` | `id`, `mode`, `tryOnLevel`, `handUrl`, `styleUrl`, `resultUrl`, `promptUrl` |
| POST | `/api/hyperreal-tryon-generate` | hyperreal try-on in `public/client/main.js` | `styleImage`, `handImage`, `userId`, `styleId`, `styleName` | `id`, `mode`, `tryOnLevel`, `handUrl`, `styleUrl`, `resultUrl`, `promptUrl` |
| POST | `/api/analytics-event` | tracking in `public/client/main.js` | `event_name`, `user_id`, `style_id`, `properties` | saved event status |
| POST | `/api/confirm-order` | confirm buttons in `public/client/main.js` | `userId`, `styleId`, `styleName`, `tryOnJobId`, `source` | order status |
| POST | `/api/style-intent` | want buttons in `public/client/main.js` | `userId`, `styleId`, `styleName`, `tryOnJobId`, `source` | intent status |
| GET | `/api/metrics-summary` | metrics renderer in `public/client/main.js` | query only | totals, styles, recent events |
| GET | `/api/mock-records` | records renderer in `public/client/main.js` | query only | try-on jobs, intents, orders |
| GET | `/api/xhs-style-dataset` | catalog loader in `public/client/main.js` | query only | style dataset |
| GET | `/api/xhs-image` | catalog images | `path` query | image bytes |
| GET | `/api/simulation-summary` | metrics simulation renderer | query only | simulation summary |
| GET | `/api/xhs-trend-snapshot` | trend views | query only | trend snapshot |
| GET | `/api/xhs-trend-overview` | trend views | query only | trend overview |
| GET | `/api/xhs-style-trend` | trend views | query params | style trend |
| GET | `/api/xhs-style-compare` | trend views | query params | style comparison |
| GET | `/api/simulation-db-summary` | simulation views | query only | simulation db summary |
| GET | `/api/recommend-sync-state` | recommend sync UI | query only | sync state |
| POST | `/api/recommend-sync-state` | recommend sync save | sync state body | save status |
| POST | `/api/recommend-sync-activity` | recommend sync activity | activity body | activity status |
| POST | `/api/recommend-sync-apply` | recommend sync apply | apply body | apply result |
| POST | `/api/hand-detect-clean` | hand model in `public/client/main.js` | `handImage` | detection result |
| POST | `/api/hand-detect-3d` | hand model in `public/client/main.js` | `handImage` | 3D detection result |
| POST | `/api/nail-segment` | nail segmentation in `public/client/main.js` | `handImage` | segmentation result |
