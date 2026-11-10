# Follow-up UI contract and baseline

Baseline is the existing dirty working tree following the UI audit, not Git HEAD. The earlier audit's route observations and limitations are documented in ../ui-unslop-prioritized-20261110/RESULT.md. Source fingerprints before this follow-up are in baseline-hashes.json; paired saved screenshots from the original audit are unavailable.

P1: improve mobile access to actions in order and customer tables without removing table semantics or horizontal keyboard scrolling. P2: display existing empty-option meaning in selectors, preserving stable accessible names and permissions. Resolve display names only from authorized API results; show IDs where data is absent or unavailable. Preserve Graphite Gold and business/API behavior.

Owners and impact: shared DataTable owns optional mobile action behavior; order and customer lists opt in. Module selectors and display names stay in their respective modules. Verify affected shared contracts, keyboard and pointer access, narrow and desktop layouts, empty/loading/denied states and source gates. Browser, native zoom, text-only resizing and other unavailable checks remain explicitly unverified; no acceptance is inferred from static checks.
