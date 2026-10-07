import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const mapPath = path.join(root, 'docs/route-implementation.json');
const currentLog = 'botsales-kit/execution/frontend-evidence/FE027/e2e-current-final-20261001-ui-coverage-complete.log';
const commonGap = 'The named browser interaction runs against deterministic synthetic data. Backend authorization, cross-user concurrency, provider behavior, and live operational guarantees are not certified by this frontend preview.';
const evidenceByFeature = {
    B01: { id: 'FE022.VS04', file: 'tests/vertical-slices/fe022-flows.spec.ts', title: 'FE022.VS04 inbox → knowledge draft → bot evaluation preserves feedback and revision source IDs' },
    B02: { id: 'FE017', file: 'tests/fe017.spec.ts', title: 'FE017 price and stock source preview uses canonical product and timestamped inventory APIs' },
    B03: { id: 'FE012.AC01', file: 'tests/fe012.spec.ts', title: 'FE012.AC01 searchable customer and product pickers submit contract-shaped draft and reject fractional quantity' },
    B04: { id: 'FE012.AC01', file: 'tests/fe012.spec.ts', title: 'FE012.AC01 editing lines invalidates quote and customer consent; a new quote is required before confirmation' },
    B05: { id: 'FE016.B05', file: 'tests/fe016.spec.ts', title: 'FE016.B05 cross-sell promotion preview shows sample rules without applying a discount', gap: 'The promotion preview is inert synthetic UI. The canonical contract has no promotion operation or price, margin, SKU, and inventory validation for a real discount.' },
    B06: { id: 'FE009.B06', file: 'tests/fe009.spec.ts', title: 'FE009.B06 after-sale cases only link orders loaded for the selected customer and customer profile shows their shipment', gap: 'The customer/order linkage and shipment preview use synthetic data. No real return, refund, or customer-filtered service-case operation is claimed.' },
    B07: { id: 'FE016.AC01', file: 'tests/fe016.spec.ts', title: 'FE016.AC01 takeover and reply use current versions and show API send state without claiming delivery' },
    B08: { id: 'FE016.B08', file: 'tests/fe016.spec.ts', title: 'FE016.B08 image and voice preview is synthetic and stays local', gap: 'The media preview is inert synthetic content. The current message contract has no media field; the sample is not sent, played, or saved.' },
    E08: { id: 'FE021.E08', file: 'tests/fe015.spec.ts', title: 'FE021.E08 report explanation is mock-only, cites the filtered P&L snapshot, and never writes finance data', gap: 'The deterministic mock explanation uses only the filtered P&L DTO. No Q&A operation or journal IDs exist, so model output or ledger drill-down is not claimed.' },
    G01: { id: 'FE009.G01', file: 'tests/fe009.spec.ts', title: 'FE009.G01 shop setup checklist guides to supported pages and leaves missing contract fields unverified', gap: 'The setup checklist guides supported frontend flows. Country, business hours, and shipping-zone persistence remain absent from the current contract.' },
    G02: { id: 'FE017.AC02', file: 'tests/fe017.spec.ts', title: 'FE017.AC02 knowledge file upload sends canonical purpose and detail reads processing status' },
    G03: { id: 'FE017.AC01', file: 'tests/fe017.spec.ts', title: 'FE017.AC01 demo publishing uses the approved permission and lifecycle substitute without an API allowedActions field', gap: 'Publishing uses the approved frontend permission and lifecycle substitute; the canonical Knowledge DTO still has no allowedActions field.' },
    G04: { id: 'FE009.B06', file: 'tests/fe009.spec.ts', title: 'FE009.B06 after-sale cases only link orders loaded for the selected customer and customer profile shows their shipment' },
    G05: { id: 'FE009.G05', file: 'tests/fe009.spec.ts', title: 'FE009.G05 marketing consent preview is interactive but never claims server opt-out', gap: 'Consent selection is local preview state. Customer has no consent field or opt-out operation, so no server preference or campaign suppression is claimed.' },
    G06: { id: 'FE017.AC04', file: 'tests/fe017.spec.ts', title: 'FE017.AC04 feedback approval creates inert draft content and its first revision only' },
    G07: { id: 'FE021', file: 'tests/fe021.spec.ts', title: 'FE021 marketing chart and table match the same synthetic API fixture and preserve missing actual spend' },
    G08: { id: 'FE021', file: 'tests/fe021.spec.ts', title: 'FE021 marketing chart and table match the same synthetic API fixture and preserve missing actual spend' },
    H05: { id: 'FE018.AC05', file: 'tests/fe018.spec.ts', title: 'FE018.AC05 manager and bot-admin roles cannot use operations outside their canonical permissions' },
    H06: { id: 'FE009.H06', file: 'tests/fe009.spec.ts', title: 'FE009.H06 audit screen distinguishes available fields from missing contract detail', gap: 'The audit screen renders fields in the current DTO and labels missing actor type, policy/config version, and detailed resource snapshot.' },
    H07: { id: 'FE018.AC03', file: 'tests/fe018.spec.ts', title: 'FE018.AC03 playground sends no external message and preserves unknown cost and token values' },
    F02: { id: 'FE020.AC02/03', file: 'tests/fe020.spec.ts', title: 'FE020.AC02/03 work-item actions follow allowedActions and operations health stays explicitly synthetic' },
    F03: { id: 'FE020.F03', file: 'tests/fe020.spec.ts', title: 'FE020.F03 operations exception filter groups overdue, blocked, and unclaimed synthetic work', gap: 'The exception view is a local filter over the currently loaded synthetic page; server-side exception queries and real worker state remain outside the frontend preview.' },
    F04: { id: 'FE020.AC01', file: 'tests/fe020.spec.ts', title: 'FE020.AC01 approval detail is fetched and a changed source resource rejects the stale decision' },
    F05: { id: 'FE020.F05', file: 'tests/fe020.spec.ts', title: 'FE020.F05 delegation rule preview stays local and grants no API approval capability', gap: 'Delegation is a local preview because the canonical contract has no delegation-rule operation; it grants no effective approval capability.' },
    F06: { id: 'FE020.AC02/03', file: 'tests/fe020.spec.ts', title: 'FE020.AC02/03 work-item actions follow allowedActions and operations health stays explicitly synthetic' },
    F07: { id: 'FE020.AC02/03', file: 'tests/fe020.spec.ts', title: 'FE020.AC02/03 work-item actions follow allowedActions and operations health stays explicitly synthetic' },
    F08: { id: 'FE018.AC03', file: 'tests/fe018.spec.ts', title: 'FE018.AC03 evaluation is synthetic, revision-bound, and cannot publish a stale draft' },
    F01: { id: 'FE018.AC05', file: 'tests/fe018.spec.ts', title: 'FE018.AC05 manager and bot-admin roles cannot use operations outside their canonical permissions' },
    A01: { id: 'FE019.AC03/04', file: 'tests/fe019.spec.ts', title: 'FE019.AC03/04 device, Telegram, and PWA checks stay synthetic and do not request OS permission' },
    A02: { id: 'FE019.AC05', file: 'tests/fe019.spec.ts', title: 'FE019.AC05 notification policy validates canonical numeric bounds before sending and acknowledges only allowed work' },
    A03: { id: 'FE019.A03', file: 'tests/fe019.spec.ts', title: 'FE019.A03 notification order link stays within the active shop scope', gap: 'The browser verifies a scoped notification-to-order route using synthetic session data. Cross-shop authorization still belongs to the backend.' },
    A04: { id: 'FE019.AC05', file: 'tests/fe019.spec.ts', title: 'FE019.AC05 notification policy validates canonical numeric bounds before sending and acknowledges only allowed work' },
    A05: { id: 'FE019.AC05', file: 'tests/fe019.spec.ts', title: 'FE019.AC05 notification policy validates canonical numeric bounds before sending and acknowledges only allowed work' },
    A06: { id: 'FE019.AC05', file: 'tests/fe019.spec.ts', title: 'FE019.AC05 notification policy validates canonical numeric bounds before sending and acknowledges only allowed work' },
    A07: { id: 'FE019.AC05', file: 'tests/fe019.spec.ts', title: 'FE019.AC05 notification policy validates canonical numeric bounds before sending and acknowledges only allowed work' },
    A08: { id: 'FE019.AC03/04', file: 'tests/fe019.spec.ts', title: 'FE019.AC03/04 device, Telegram, and PWA checks stay synthetic and do not request OS permission', gap: 'The browser verifies safe synthetic device previews. Real callback replay protection, deduplication, throttling, and provider delivery remain server-side.' },
    C01: { id: 'FE013.AC01–AC04', file: 'tests/fe013.spec.ts', title: 'FE013.AC01–AC04 stale claim conflict is visible; pick, pack, dispatch and delivery use current API versions once' },
    C02: { id: 'FE013.AC01–AC04', file: 'tests/fe013.spec.ts', title: 'FE013.AC01–AC04 stale claim conflict is visible; pick, pack, dispatch and delivery use current API versions once' },
    C03: { id: 'FE013.AC01–AC04', file: 'tests/fe013.spec.ts', title: 'FE013.AC01–AC04 stale claim conflict is visible; pick, pack, dispatch and delivery use current API versions once' },
    C04: { id: 'FE013.C04', file: 'tests/fe013.spec.ts', title: 'FE013.C04 shipping preview distinguishes missing address, unserviceable zone, and expired mock quote', gap: 'The preview covers address, serviceability, package size, and quote-expiry UI states. No real address quote or shipping-zone persistence is claimed.' },
    C05: { id: 'FE013.AC01–AC04', file: 'tests/fe013.spec.ts', title: 'FE013.AC01–AC04 stale claim conflict is visible; pick, pack, dispatch and delivery use current API versions once' },
    C06: { id: 'FE013.AC01–AC04', file: 'tests/fe013.spec.ts', title: 'FE013.AC01–AC04 stale claim conflict is visible; pick, pack, dispatch and delivery use current API versions once' },
    C07: { id: 'FE012.AC04', file: 'tests/fe012.spec.ts', title: 'FE012.AC04 return inspection loads the current case and applies accepted partial quantity to mock stock and refund' },
    C08: { id: 'FE012.AC03', file: 'tests/fe012.spec.ts', title: 'FE012.AC03 handed-over order routes to returns and exposes no ordinary cancel action' },
    D01: { id: 'FE011.AC01', file: 'tests/fe011.spec.ts', title: 'FE011.AC01 snapshot drives stock totals and the SKU opens its catalog result' },
    D02: { id: 'FE014.AC01', file: 'tests/fe014.spec.ts', title: 'FE014.AC01 multi-line purchase validates MOQ/pack size and binds approval to the created intent' },
    D03: { id: 'FE014.D03/D04/D07', file: 'tests/fe014.spec.ts', title: 'FE014.D03/D04/D07 replenishment uses min-max rules, labels forecast limits, and blocks duplicate proposals', gap: 'The demo implements versioned min-max suggestions, not a demand forecast. Budget enforcement and concurrent proposal uniqueness require authoritative backend validation.' },
    D04: { id: 'FE014.D03/D04/D07', file: 'tests/fe014.spec.ts', title: 'FE014.D03/D04/D07 replenishment uses min-max rules, labels forecast limits, and blocks duplicate proposals' },
    D05: { id: 'FE014.AC02', file: 'tests/fe014.spec.ts', title: 'FE014.AC02 approval covers the exact purchase intent; unknown send is blocked from blind retry' },
    D06: { id: 'FE014.S03', file: 'tests/fe014.spec.ts', title: 'FE014.S03 auto-send cannot be configured without an enabled procurement budget' },
    D07: { id: 'FE014.D03/D04/D07', file: 'tests/fe014.spec.ts', title: 'FE014.D03/D04/D07 replenishment uses min-max rules, labels forecast limits, and blocks duplicate proposals', gap: 'The synthetic flow prevents duplicate active proposals in the demo UI. Cross-worker uniqueness and budget reservation require a real transactional backend.' },
    D08: { id: 'FE014.AC03', file: 'tests/fe014.spec.ts', title: 'FE014.AC03 partial receipt posts only accepted units to synthetic stock and payable once' },
    E01: { id: 'FE015.AC02', file: 'tests/fe015.spec.ts', title: 'FE015.AC02 journal rejects unbalanced decimal lines before POST and sends exact money strings' },
    E02: { id: 'FE015.AC01', file: 'tests/fe015.spec.ts', title: 'FE015.AC01 report filters use exact timezone boundaries and mock API aggregates' },
    E03: { id: 'FE015.AC03', file: 'tests/fe015.spec.ts', title: 'FE015.AC03 COD settlement matches net remittance plus documented fee' },
    E04: { id: 'FE015.AC03', file: 'tests/fe015.spec.ts', title: 'FE015.AC03 CSV import keeps partial row failures visible and deduplicates external transactions' },
    E05: { id: 'FE015.AC03', file: 'tests/fe015.spec.ts', title: 'FE015.AC03 COD settlement matches net remittance plus documented fee' },
    E06: { id: 'FE015.AC03', file: 'tests/fe015.spec.ts', title: 'FE015.AC03 partial bank allocation leaves the remaining amount and debt visible' },
    E07: { id: 'FE015.AC02', file: 'tests/fe015.spec.ts', title: 'FE015.AC02 closed accounting period is visible and disables journal draft creation' },
    H02: { id: 'FE018.AC02', file: 'tests/fe018.spec.ts', title: 'FE018.AC02 role kill switch is versioned, preserves API tools, and does not pause the whole bot' },
    H03: { id: 'FE018.S03', file: 'tests/fe018.spec.ts', title: 'FE018.S03 synthetic budget and tool denials retain the prompt and never show a generated answer' },
    H01: { id: 'FE020.AC02/03', file: 'tests/fe020.spec.ts', title: 'FE020.AC02/03 work-item actions follow allowedActions and operations health stays explicitly synthetic', gap: 'The UI shows only synthetic worker/operations health. Queue durability, restart recovery, and real worker progress are outside the frontend demo.' },
    H04: { id: 'FE011.AC03', file: 'tests/fe011.spec.ts', title: 'FE011.AC03 unknown command blocks duplicate submission until shared recovery reconciles it' },
    H08: { id: 'FE020.AC03', file: 'tests/fe020.spec.ts', title: 'FE020.AC03 role pause control uses the canonical versioned mock and never claims readiness', gap: 'The UI keeps readiness synthetic and does not certify backup restoration, deployment gates, environment freshness, or launch approval.' },
};

const routes = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const mappings = routes.flatMap(route => (route.featureCoverage ?? []).map(feature => {
    const evidence = evidenceByFeature[feature.featureId];
    if (!evidence) throw new Error(`Missing interaction evidence mapping for ${feature.featureId}.`);
    return { routeId: route.routeId, featureId: feature.featureId, ...evidence, gap: evidence.gap ?? commonGap };
}));
const log = fs.readFileSync(path.join(root, currentLog), 'utf8');
const passMatch = log.match(/^\s*(\d+) passed \([^)]+\)\s*$/m);
if (!passMatch || Number(passMatch[1]) < 110) throw new Error('Current Chromium log is missing or has fewer than 110 passing tests.');

for (const mapping of mappings) {
    const route = routes.find(item => item.routeId === mapping.routeId);
    const feature = route?.featureCoverage?.find(item => item.featureId === mapping.featureId);
    const testSource = fs.readFileSync(path.join(root, mapping.file), 'utf8');
    if (!feature || !testSource.includes(mapping.id) || !testSource.includes(mapping.title) || !log.includes(mapping.title)) {
        throw new Error(`Missing route, feature or named browser case for ${mapping.featureId}.`);
    }
    feature.coverage = 'FRONTEND_INTERACTION_VERIFIED_SYNTHETIC';
    feature.gap = mapping.gap;
    feature.evidenceCases = (feature.evidenceCases ?? []).filter(item => item.id !== mapping.id);
    feature.evidenceCases.push({
        id: mapping.id,
        file: mapping.file,
        title: mapping.title,
        result: 'PASS',
        logFile: currentLog,
    });
}

fs.writeFileSync(mapPath, `${JSON.stringify(routes, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({ status: 'PASS', updatedFeatures: mappings.length, featureIds: [...new Set(mappings.map(item => item.featureId))], browserTests: Number(passMatch[1]), logFile: currentLog })}\n`);
