# DOM Map

The active frontend entry is `public/client/main.js`. Placeholder module files exist under `public/client/modules/` for future copy-out extraction.

| DOM id / data attr | Page | Current owner |
| --- | --- | --- |
| `.tab`, `.page`, `data-page` | global navigation | `public/client/main.js` |
| `#nailGrid`, `#primaryFilters`, `#secondaryFilters`, `#filterStatus` | catalog | future `modules/catalog.js` |
| `#tryon`, `.embedded-tryon-page` | custom try-on | future `modules/tryon.js`; iframe points to `public/embedded/custom-tryon-123/index.html` |
| `#styleUpload`, `#handUpload`, `#composeBtn`, `#hyperrealComposeBtn`, `#tryonResult` | hidden legacy try-on placeholders | future `modules/tryon.js` |
| `#handModelBtn`, `#handModelResult`, `#nailSegmentBtn`, `#nailSegmentResult` | hidden legacy hand/segmentation placeholders | future `modules/hand.js` |
| `#batchHandUpload`, `#batchTryonBtn`, `#batchHyperrealTryonBtn`, `#batchResultGrid` | batch try-on | future `modules/tryon.js` |
| `#recommendUpload`, `#recommendPreview`, `#chatWindow`, `#chatForm`, `#chatInput`, `#memoryList` | recommendation chat | future `modules/recommend.js` |
| `#wantListGrid`, `#orderListGrid`, `#refreshWantListBtn` | want/confirm records | future `modules/records.js` |
| `data-select-tryon`, `data-intent-style`, `data-confirm-style`, `data-page-target` | shared buttons | `public/client/main.js` event delegation |

Removed from visible navigation: `data-page="dataDesign"`. The old data design section was removed from `public/index.html`.
