# Henry starter artwork — issue #2

Build on the foundation branch without claiming issue #1's pending manual
browser matrix is complete. Keep this work on feat/henry-starter-sprites.

Henry uses brown hair, a yellow hard hat, orange reflective safety vest, blue
clothes and brown work boots. His silhouette is a detailed child with rounded
human features, against chunky grass and dirt terrain. Generate a master
reference/style sheet followed by a transparent starter atlas using that image
as the identity reference. Preserve original tool outputs and exact prompts.

Use uniform 48 × 48 logical animation cells, right-facing poses, and a shared
bottom-center anchor. The local processing step measures each generated frame's
actual opaque bounds, then writes source rectangles and offsets into the
manifest; do not assume generator grid accuracy.
Document the final layout and timings for issue #3. Collision remains separate.

Add a query-selected asset preview to the existing scene lifecycle. Show idle,
run, jump and fall at gameplay size and enlarged against contrasting backgrounds,
with a visible alignment guide and the generated Plains reference. Keep the
foundation preview available. Asset loading must show a readable failure state.

Validate animation timing and frame selection using unit tests, source image
transparency and bounds using the browser, and rendering/pause/loading failures
against the production build. Save only local assets; no runtime service calls.
