import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const requireFile = relative => {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) throw new Error(`Missing evidence/source: ${relative}`);
    return fs.readFileSync(absolute, 'utf8');
};

const routeEvidenceFile = process.argv[2] || '../botsales-kit/execution/frontend-evidence/FE027/e2e-current-final-20261002-frontend-coverage.log';
const journeyEvidenceFile = routeEvidenceFile;
const routeEvidence = requireFile(routeEvidenceFile);
const journeyEvidence = requireFile(journeyEvidenceFile);
const routeRunPassCount = Number(routeEvidence.match(/^\s*(\d+) passed \([^)]+\)\s*$/m)?.[1] || 0);
if (routeRunPassCount < 128 || !routeEvidence.includes('all canonical routes render inside the real React demo application')) {
    throw new Error('Current full browser run does not prove the 54-route smoke case and baseline browser cases passed.');
}
if (routeRunPassCount < 128) throw new Error('Current full browser run must pass before generating the matrix.');

const routeManifest = read('../botsales-kit/contracts/route-manifest.json');
const featureCatalog = read('../botsales-kit/contracts/feature-catalog.json');
const existing = read('docs/route-implementation.json');
const oldRoutes = new Map(existing.map(route => [route.routeId, route]));
const routeJourneys = [
    {
        id: 'FE022.VS01',
        title: 'FE022.VS01 catalog → stock → order → prep keeps product, reservation, and order references linked',
        file: 'tests/vertical-slices/fe022-flows.spec.ts',
        routes: ['R09', 'R15', 'R17', 'R18', 'R19', 'R41'],
    },
    {
        id: 'FE022.VS02',
        title: 'FE022.VS02 procurement → approval → receipt → stock and payable preserves the purchase identity',
        file: 'tests/vertical-slices/fe022-flows.spec.ts',
        routes: ['R38', 'R44', 'R45', 'R46', 'R47', 'R15', 'R50'],
    },
    {
        id: 'FE022.VS03',
        title: 'FE022.VS03 finance → reconciliation retains bank transaction and partial debt allocation',
        file: 'tests/vertical-slices/fe022-flows.spec.ts',
        routes: ['R20', 'R49', 'R50'],
    },
    {
        id: 'FE022.VS04',
        title: 'FE022.VS04 inbox → knowledge draft → bot evaluation preserves feedback and revision source IDs',
        file: 'tests/vertical-slices/fe022-flows.spec.ts',
        routes: ['R05', 'R06', 'R23', 'R24', 'R25', 'R28'],
    },
];
const directFeatureEvidence = new Map([
    ['A02', 'FE027.A02/A07 preparation notification keeps order evidence and separates queued, opened, and acknowledged states', 'tests/fe019.spec.ts'],
    ['A01', 'FE019.AC03/04 device, Telegram, and PWA checks stay synthetic and do not request OS permission', 'tests/fe019.spec.ts'],
    ['A03', 'FE019.A03 notification order link stays within the active shop scope', 'tests/fe019.spec.ts'],
    ['A04', 'FE019.AC05 notification policy validates canonical numeric bounds before sending and acknowledges only allowed work', 'tests/fe019.spec.ts'],
    ['A06', 'FE019.AC05 notification policy validates canonical numeric bounds before sending and acknowledges only allowed work', 'tests/fe019.spec.ts'],
    ['A05', 'FE019.A05 reminder policy saves shop-local schedule and quiet hours through the synthetic API', 'tests/fe019.spec.ts'],
    ['A07', 'FE027.A02/A07 preparation notification keeps order evidence and separates queued, opened, and acknowledged states', 'tests/fe019.spec.ts'],
    ['A08', 'FE027.A08 notification settings disclose server-only deduplication and callback safeguards', 'tests/fe019.spec.ts'],
    ['B01', 'FE027.B01 industry sales script preview asks for missing facts and stays a local draft', 'tests/fe016.spec.ts'],
    ['B02', 'FE027.B02 inbox price and available stock preview uses current canonical mock reads', 'tests/fe016.spec.ts'],
    ['B03', 'FE027.B03 order capture links the active customer and conversation into the manual order form', 'tests/fe016.spec.ts'],
    ['B04', 'FE027.B04 automatic order confirmation stays unavailable until policy and customer evidence exist', 'tests/fe016.spec.ts'],
    ['B05', 'FE016.B05 cross-sell promotion preview shows sample rules without applying a discount', 'tests/fe016.spec.ts'],
    ['B06', 'FE009.B06 after-sale cases only link orders loaded for the selected customer and customer profile shows their shipment', 'tests/fe009.spec.ts'],
    ['B07', 'FE016.AC01 takeover and reply use current versions and show API send state without claiming delivery', 'tests/fe016.spec.ts'],
    ['B08', 'FE016.B08 image and voice preview is synthetic and stays local', 'tests/fe016.spec.ts'],
    ['C01', 'FE013.AC01–AC04 stale claim conflict is visible; pick, pack, dispatch and delivery use current API versions once', 'tests/fe013.spec.ts'],
    ['C02', 'FE013.AC01–AC04 stale claim conflict is visible; pick, pack, dispatch and delivery use current API versions once', 'tests/fe013.spec.ts'],
    ['C03', 'FE013.AC01–AC04 stale claim conflict is visible; pick, pack, dispatch and delivery use current API versions once', 'tests/fe013.spec.ts'],
    ['C04', 'FE013.C04 shipping preview distinguishes missing address, unserviceable zone, and expired mock quote', 'tests/fe013.spec.ts'],
    ['C05', 'FE013.AC03 unknown handover cannot be repeated before command reconciliation', 'tests/fe013.spec.ts'],
    ['C06', 'FE013.AC01–AC04 stale claim conflict is visible; pick, pack, dispatch and delivery use current API versions once', 'tests/fe013.spec.ts'],
    ['C07', 'FE012.AC04 return inspection loads the current case and applies accepted partial quantity to mock stock and refund', 'tests/fe012.spec.ts'],
    ['C08', 'FE012.AC03 handed-over order routes to returns and exposes no ordinary cancel action', 'tests/fe012.spec.ts'],
    ['D01', 'FE011.AC01 snapshot drives stock totals and the SKU opens its catalog result', 'tests/fe011.spec.ts'],
    ['D02', 'FE027.D02 supplier workspace edits the selected contact through its current version and displays MOQ offers', 'tests/fe014.spec.ts'],
    ['D03', 'FE014.D03/D04/D07 replenishment uses min-max rules, labels forecast limits, and blocks duplicate proposals', 'tests/fe014.spec.ts'],
    ['D04', 'FE014.D03/D04/D07 replenishment uses min-max rules, labels forecast limits, and blocks duplicate proposals', 'tests/fe014.spec.ts'],
    ['D05', 'FE014.AC02 approval covers the exact purchase intent; unknown send is blocked from blind retry', 'tests/fe014.spec.ts'],
    ['D06', 'FE014.S03 auto-send cannot be configured without an enabled procurement budget', 'tests/fe014.spec.ts'],
    ['D07', 'FE014.D03/D04/D07 replenishment uses min-max rules, labels forecast limits, and blocks duplicate proposals', 'tests/fe014.spec.ts'],
    ['D08', 'FE014.AC03 partial receipt posts only accepted units to synthetic stock and payable once', 'tests/fe014.spec.ts'],
    ['E01', 'FE015.AC02 journal rejects unbalanced decimal lines before POST and sends exact money strings', 'tests/fe015.spec.ts'],
    ['E02', 'FE015.E02/E03 profit report renders canonical cost, gross-profit and operating-expense values', 'tests/fe015.spec.ts'],
    ['E03', 'FE015.E02/E03 profit report renders canonical cost, gross-profit and operating-expense values', 'tests/fe015.spec.ts'],
    ['E04', 'FE015.AC03 CSV import keeps partial row failures visible and deduplicates external transactions', 'tests/fe015.spec.ts'],
    ['E05', 'FE015.AC03 COD settlement matches net remittance plus documented fee', 'tests/fe015.spec.ts'],
    ['E06', 'FE015.AC03 partial bank allocation leaves the remaining amount and debt visible', 'tests/fe015.spec.ts'],
    ['E07', 'FE015.AC02 closed accounting period is visible and disables journal draft creation', 'tests/fe015.spec.ts'],
    ['E08', 'FE021.E08 report explanation is mock-only, cites the filtered P&L snapshot, and never writes finance data', 'tests/fe015.spec.ts'],
    ['F01', 'FE018.AC05 manager and bot-admin roles cannot use operations outside their canonical permissions', 'tests/fe018.spec.ts'],
    ['F02', 'FE020.AC02/03 work-item actions follow allowedActions and operations health stays explicitly synthetic', 'tests/fe020.spec.ts'],
    ['F03', 'FE020.F03 operations exception filter groups overdue, blocked, and unclaimed synthetic work', 'tests/fe020.spec.ts'],
    ['F04', 'FE020.AC01 approval detail is fetched and a changed source resource rejects the stale decision', 'tests/fe020.spec.ts'],
    ['F05', 'FE020.F05 delegation rule preview stays local and grants no API approval capability', 'tests/fe020.spec.ts'],
    ['F06', 'FE020.F06/H01 digest and dependency health panels show synthetic history without claiming workers are ready', 'tests/fe020.spec.ts'],
    ['H01', 'FE020.F06/H01 digest and dependency health panels show synthetic history without claiming workers are ready', 'tests/fe020.spec.ts'],
    ['F07', 'FE020.AC02/03 work-item actions follow allowedActions and operations health stays explicitly synthetic', 'tests/fe020.spec.ts'],
    ['F08', 'FE018.AC03 evaluation is synthetic, revision-bound, and cannot publish a stale draft', 'tests/fe018.spec.ts'],
    ['G01', 'FE009.G01 shop setup checklist guides to supported pages and leaves missing contract fields unverified', 'tests/fe009.spec.ts'],
    ['G02', 'FE027.G02 product content brief edits source, size, warranty, alternatives, and forbidden claims locally', 'tests/fe017.spec.ts'],
    ['G03', 'FE027.G03 policy revisions keep the published snapshot immutable when a draft changes', 'tests/fe017.spec.ts'],
    ['G04', 'FE009.B06 after-sale cases only link orders loaded for the selected customer and customer profile shows their shipment', 'tests/fe009.spec.ts'],
    ['G05', 'FE009.G05 marketing consent preview is interactive but never claims server opt-out', 'tests/fe009.spec.ts'],
    ['G06', 'FE017.AC04 feedback approval creates inert draft content and its first revision only', 'tests/fe017.spec.ts'],
    ['G07', 'FE021 marketing chart and table match the same synthetic API fixture and preserve missing actual spend', 'tests/fe021.spec.ts'],
    ['G08', 'FE021 marketing chart and table match the same synthetic API fixture and preserve missing actual spend', 'tests/fe021.spec.ts'],
    ['H02', 'FE018.AC02 role kill switch is versioned, preserves API tools, and does not pause the whole bot', 'tests/fe018.spec.ts'],
    ['H03', 'FE027.H03 budget and provider failover preview refuses silent provider switching on exhaustion', 'tests/fe018.spec.ts'],
    ['H04', 'FE011.AC03 unknown command blocks duplicate submission until shared recovery reconciles it', 'tests/fe011.spec.ts'],
    ['H05', 'FE018.AC05 manager and bot-admin roles cannot use operations outside their canonical permissions', 'tests/fe018.spec.ts'],
    ['H06', 'FE009.H06 audit screen distinguishes available fields from missing contract detail', 'tests/fe009.spec.ts'],
    ['H07', 'FE018.AC03 playground sends no external message and preserves unknown cost and token values', 'tests/fe018.spec.ts'],
    ['H08', 'FE027.H08 restore and release readiness stay unknown without a verified rehearsal or deployment gate', 'tests/fe020.spec.ts'],
].map(([featureId, title, file]) => [featureId, { id: title.slice(0, title.indexOf(' ')), file, title }]));

if (routeManifest.routes.length !== 54 || featureCatalog.features.length !== 64) {
    throw new Error(`Unexpected canonical coverage: ${routeManifest.routes.length} routes / ${featureCatalog.features.length} features.`);
}
const routeTestTitle = 'all canonical routes render inside the real React demo application';
const journeyTestSource = requireFile('tests/vertical-slices/fe022-flows.spec.ts');
const generated = routeManifest.routes.map(route => {
    const previous = oldRoutes.get(route.id);
    if (!previous || previous.route !== route.path) throw new Error(`Missing reviewed source/component mapping for ${route.id}.`);
    const journeys = routeJourneys.filter(journey => journey.routes.includes(route.id)).map(({ id, title, file }) => ({ id, title, file }));
    const featureCoverage = featureCatalog.features.filter(feature => feature.routeIds.includes(route.id)).map(feature => {
        const coveredJourneys = journeys.filter(journey => feature.routeIds.includes(route.id));
        const directEvidence = directFeatureEvidence.get(feature.id);
        const evidenceCases = [
            { id: 'ROUTE-SMOKE-54', file: 'tests/frontend.spec.ts', title: routeTestTitle, result: 'PASS', logFile: routeEvidenceFile },
            ...coveredJourneys.map(journey => ({ id: journey.id, file: journey.file, title: journey.title, result: 'PASS', logFile: journeyEvidenceFile })),
            ...(directEvidence ? [{ ...directEvidence, result: 'PASS', logFile: journeyEvidenceFile }] : []),
        ];
        return {
            featureId: feature.id,
            title: feature.title,
            scenarioId: feature.scenarioId,
            canonicalRouteIds: feature.routeIds,
            coverage: directEvidence ? 'FRONTEND_INTERACTION_VERIFIED_SYNTHETIC' : coveredJourneys.length ? 'PARTIAL_SYNTHETIC_CROSS_MODULE_JOURNEY' : 'ROUTE_MOUNT_ONLY',
            evidenceCases,
            gap: directEvidence
                ? 'The linked feature-specific browser case verifies this frontend slice with synthetic MSW; remaining acceptance and real backend/provider behavior are not established.'
                : coveredJourneys.length
                ? 'The named browser journey validates this client path with synthetic MSW only; remaining acceptance cases and real backend/provider behavior are not established.'
                : 'FE022 proves route mounting for this screen only. Feature-specific interactions and real backend/provider behavior require separate evidence; no product-level completion is claimed here.',
        };
    });
    return {
        routeId: route.id,
        route: route.path,
        source: previous.source,
        component: previous.component,
        state: 'BROWSER_ROUTE_RENDERED_WITH_SYNTHETIC_API',
        routeEvidence: {
            testFile: 'tests/frontend.spec.ts',
            testTitle: routeTestTitle,
            result: 'PASS',
            logFile: routeEvidenceFile,
        },
        journeys,
        acceptanceScenarioIds: route.acceptanceScenarioIds,
        featureCoverage,
    };
});

for (const journey of routeJourneys) {
    if (!journeyEvidence.includes(journey.id) || !journeyTestSource.includes(`test('FE022.${journey.id.slice('FE022.'.length)}`)) {
        throw new Error(`Journey ${journey.id} is not both declared in the test source and present in its passing run.`);
    }
}
for (const [featureId, evidence] of directFeatureEvidence) {
    if (!requireFile(evidence.file).includes(evidence.title) || !routeEvidence.includes(evidence.title)) {
        throw new Error(`Direct feature ${featureId} is missing its exact test case in source or the current passing browser log.`);
    }
}
const mappedFeatureIds = new Set(generated.flatMap(route => route.featureCoverage.map(feature => feature.featureId)));
for (const feature of featureCatalog.features) {
    if (!feature.routeIds.length || feature.routeIds.some(routeId => !generated.some(route => route.routeId === routeId))) {
        throw new Error(`Feature ${feature.id} has no complete canonical route mapping.`);
    }
}
if (mappedFeatureIds.size !== 64) throw new Error('The route matrix does not trace all 64 feature IDs.');

fs.writeFileSync(path.join(root, 'docs/route-implementation.json'), `${JSON.stringify(generated, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ status: 'PASS', routes: generated.length, uniqueFeatures: mappedFeatureIds.size, routeEvidenceFile, journeyEvidenceFile }, null, 2));
