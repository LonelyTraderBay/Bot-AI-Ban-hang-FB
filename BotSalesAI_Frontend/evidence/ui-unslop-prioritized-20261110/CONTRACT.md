# UI audit fixes — contract and baseline

Baseline: Git HEAD `160f99cb`; working tree clean before this task. The previous
turn inspected the current React demo at 1440×900 and 390×844, including 61 route
entry states. R14 had no valid import job; R36/R61 had additional valid mock states.
Those browser observations appeared in the conversation but were not saved as
paired baseline screenshots, so paired visual acceptance remains NOT_VERIFIED.

Scope: P1 and P2 findings in the user's audit, frontend and synthetic demo only.
Preserve Graphite Gold, native date controls, permissions, data and API contracts.
No backend, provider, generated contract/token, full-product tracker or release
change. UI acceptance requires loaded render and interaction at desktop/mobile;
source checks alone are not browser proof.

Owners and impact: `DataTable` owns shared table scrolling and affects all table
consumers; customer addresses owns its narrow table; MUI select consumers own
the meaning of empty values; finance report range owns exclusive-end explanation;
date-field consumers own their displayed ISO date context. Page-specific UI copy,
demo disclosure, dashboard hierarchy, notifications and consent remain in their
own modules. Token values and MUI theme remain canonical. Source and affected
consumer tests, focus/keyboard scrolling, loaded states and layouts at both widths
must be checked. Native zoom, text-only resize, physical mobile, screen reader,
full route/state coverage and paired baseline evidence are separate gates; record
actual results and do not mark unobserved gates as PASS.
