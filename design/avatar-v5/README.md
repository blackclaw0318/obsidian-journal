# v5 source state

No Meshy download, imported v5 geometry, editable final `.blend` or v5 QA render is
present. The current normal download is blocked by the Meshy account subscription
gate; the user is handling account access. The UI reportedly shows 42 geometry
components and a failed N1 texture operation. Those UI facts are not an inventory
of model bytes, PBR quality or rig readiness.

`import-manifest.example.json` intentionally has no assets. Use the
[intake workflow](../../scripts/avatar-v5/README.md) after obtaining a legitimate
download. Raw downloads, working blends and QA renders go into ignored
`incoming/`, `work/` and `qa/`. An approved packed editable source can later be
saved here as `avatar-v5.blend`; no placeholder asset is supplied.
