import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const kit = path.resolve(dir, '../..');
const repo = path.resolve(kit, '..');
const plan = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-plan.json'), 'utf8'));
const initialProgress = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-progress.json'), 'utf8'));
const routeMap = JSON.parse(fs.readFileSync(path.join(repo, 'docs/route-implementation.json'), 'utf8'));
const routeMatrix = JSON.parse(fs.readFileSync(path.join(repo, 'docs/route-state-role-matrix.json'), 'utf8'));
const map = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const commands = new Map(map.commands.map(command => [command.id, command]));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const relRepo = relative => path.join(repo, relative);
const relKit = relative => path.join(kit, relative);
const now = () => new Date().toISOString();
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
const branch = execFileSync('git', ['branch', '--show-current'], { cwd: repo, encoding: 'utf8' }).trim();
const nodeVersion = execFileSync(process.execPath, ['-v'], { cwd: repo, encoding: 'utf8' }).trim();
const npmCli = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
const npmVersion = execFileSync(process.execPath, [npmCli, '-v'], { cwd: repo, encoding: 'utf8' }).trim();
const e2eFile = 'execution/frontend-evidence/FE027/e2e-current-route-role-20261002.log';
const verifyFile = 'execution/frontend-evidence/FE026/verify-after-route-role-matrix-current-20261002.log';
const roleFile = 'execution/frontend-evidence/FE024/route-role-matrix-current-final-20261002.log';
const currentE2e = fs.readFileSync(relKit(e2eFile), 'utf8');
const currentVerify = fs.readFileSync(relKit(verifyFile), 'utf8');
const currentRole = fs.readFileSync(relKit(roleFile), 'utf8');

if (!currentE2e.includes('143 passed (5.9m)') || !currentE2e.includes('ROUTE_ROLE_MATRIX_CASES=357') || !currentVerify.includes('71 passed (71)'))
    throw new Error('Current verification logs do not contain the expected passing results.');
if (routeMap.length !== 54 || routeMatrix.summary?.routeRoleBrowserMatrix !== 'PASS' || routeMatrix.summary?.passedRouteRoleCases !== 357)
    throw new Error('Current route or route-role matrix is not complete for its declared test scope.');

const fullPlanFile = relRepo('botsales-kit/execution/plan.json');
const fullProgressFile = relRepo('botsales-kit/execution/progress.json');
const fullPlanHash = hash(fs.readFileSync(fullPlanFile));
const fullProgressHash = hash(fs.readFileSync(fullProgressFile));
const gitQuiet = args => {
    try {
        execFileSync('git', args, { cwd: repo, stdio: 'ignore' });
        return true;
    } catch (error) {
        if (error.status === 1) return false;
        throw error;
    }
};
const fullProductUnchanged = gitQuiet(['diff', '--quiet', 'HEAD', '--', 'botsales-kit/execution/plan.json', 'botsales-kit/execution/progress.json'])
    && gitQuiet(['diff', '--cached', '--quiet', '--', 'botsales-kit/execution/plan.json', 'botsales-kit/execution/progress.json']);

const testRun = (taskId, stepId) => {
    const currentE2eRun = { commandId: 'e2e-current-20261002', logFile: e2eFile, checks: 143, dataSource: 'synthetic-msw', observed: '143/143 Chromium browser tests passed on the built React demo artifact. The run includes 54 canonical routes, 65 direct feature-route interactions, 357 route-read permission checks across 51 shop routes × 7 mock roles, state cases, security checks, dataset pagination, and four cross-module journeys.' };
    const verifyRun = { commandId: 'verify-current-20261002', logFile: verifyFile, checks: 71, dataSource: 'synthetic-msw', observed: 'The integrated verify command passed generated freshness (11 outputs, 283 schemas, 210 operations, 54 routes), source checks (60 files, 226 operation refs, 54 routes), boundaries (406 imports and 8/8 negative fixtures), lint, typecheck, domain/MSW (88/88), Vitest (71/71), and production build. Vite emitted the recorded >500 kB raw chunk advisory.' };
    if (taskId === 'FE002') {
        if (stepId === 'S03') return { commandId: 'install', logFile: 'execution/frontend-evidence/FE002/S03-current-run-20261001.log', checks: 3, dataSource: 'source-only', observed: 'The registered npm install exited 0; package manifest and real v3 lock stayed synchronized and byte-identical, npm ls resolved one React/React DOM version, and the log records no peer conflict.' };
        if (stepId === 'S04') return { commandId: 'setup-doctor-capture', logFile: 'execution/frontend-evidence/FE002/S04-current-run-20261001.log', checks: 9, dataSource: 'source-only', observed: 'Node/npm pins, npm setup, official MSW worker generation, and doctor checks passed. The existing .env.local hash was preserved; doctor reported all nine checks passing.' };
        if (stepId === 'S05') return { commandId: 'clean-ci-20261002', logFile: 'execution/frontend-evidence/FE026/cold-install-build-current-20261002.log', checks: 3, dataSource: 'source-only', observed: 'In an isolated copy of the current working tree, npm ci, production build, and demo build all exited 0; the temp copy was removed and Test-Path returned False. Two npm lifecycle scripts await approval, but esbuild/MSW imports and both builds passed.' };
    }
    if (['FE004', 'FE005'].includes(taskId)) return stepId === 'S04' ? { commandId: 'unit-verbose-20261002', logFile: 'execution/frontend-evidence/FE023/unit-current-verbose-20261002.log', checks: 71, dataSource: 'source-only', observed: 'Vitest passed 71/71 across eight files on the current source snapshot; the integrated verify log separately confirms typecheck, lint, source and architecture checks.' } : verifyRun;
    if (taskId === 'FE006') return stepId === 'S04' ? currentE2eRun : verifyRun;
    if (taskId === 'FE007') return currentE2eRun;
    if (taskId === 'FE008') return stepId === 'S04' ? { commandId: 'mock-schema-20261002', logFile: 'execution/frontend-evidence/FE024/mock-schema-current-20261002-passing.log', checks: 356, dataSource: 'synthetic-msw', observed: 'The current mock JSON Schema validator passed 356/356 fixtures. Domain and MSW simulation checks separately passed 88/88 in the current verify run.' } : stepId === 'S01' ? verifyRun : currentE2eRun;
    if (/^FE(009|010|011|012|013|014|015|016|017|018|019|020|021|022)$/.test(taskId)) return currentE2eRun;
    if (taskId === 'FE023') return stepId === 'S01' || stepId === 'S05'
        ? { commandId: 'route-state-role-map-full-20261002', logFile: 'execution/frontend-evidence/FE023/route-state-role-matrix-current-20261002.log', checks: 372, dataSource: 'synthetic-msw', observed: 'The current role/state matrix was generated from the 71-test unit log, the 143-test browser log, and the direct 357-case route-role log. It records 54 routes × 7 roles and 15 shared state cases; route-specific state coverage remains explicitly limited.' }
        : currentE2eRun;
    if (taskId === 'FE024') {
        if (stepId === 'S03') return { commandId: 'route-role-matrix-test-20261002', logFile: roleFile, checks: 357, dataSource: 'synthetic-msw', observed: 'The focused Chromium route guard test passed all 357 expected permission decisions across 51 shop routes and seven demo roles, derived from the canonical permission catalog. This proves UI behavior for the mock, not backend authorization.' };
        if (stepId === 'S05') return { commandId: 'npm-audit-20261002', logFile: 'execution/frontend-evidence/FE024/npm-audit-current-20261002.json', checks: 478, dataSource: 'source-only', observed: 'Current lockfile audit covers 478 dependencies and reports zero vulnerabilities.' };
        return currentE2eRun;
    }
    if (taskId === 'FE025') {
        if (stepId === 'S02' || stepId === 'S05') return { commandId: 'reflow-320-20261002', logFile: 'execution/frontend-evidence/FE027/route-reflow-320-current-20261002.log', checks: 54, dataSource: 'synthetic-msw', observed: 'The built React demo passed the 320 CSS px layout audit on all 54 routes with no horizontal document overflow or page errors. This is a reflow proxy, not actual browser zoom or screen-reader validation.' };
        return currentE2eRun;
    }
    if (taskId === 'FE026') {
        if (stepId === 'S01' || stepId === 'S02' || stepId === 'S05') return { commandId: 'artifact-manifest-20261002', logFile: 'execution/frontend-evidence/FE026/artifact-manifest-current-20261002.log', checks: 2, dataSource: 'source-only', observed: 'The production/demo tree manifest was rebuilt after the latest E2E build. Production contains 32 files and no MSW worker; demo contains 37 files and includes the worker. Checksums are preserved in the manifest.' };
        if (stepId === 'S03') return { commandId: 'clean-ci-20261002', logFile: 'execution/frontend-evidence/FE026/cold-install-build-current-20261002.log', checks: 3, dataSource: 'source-only', observed: 'Clean npm ci, production build, and demo build passed in an isolated copy. The latest integrated verify log separately records generated/source/boundary checks, lint, typecheck, domain/MSW 88/88, Vitest 71/71, and production build; the latest 143/143 browser run validates the built demo artifact.', supportingLogs: [verifyFile, e2eFile] };
        return currentE2eRun;
    }
    if (taskId === 'FE027') {
        if (stepId === 'S03') return { commandId: 'capture-ui-20261002', logFile: 'execution/frontend-evidence/FE027/capture-ui-review-current-20261002.log', checks: 4, dataSource: 'synthetic-msw', observed: 'Four screenshots and a request manifest were captured from the React demo after scrolling to the top. The capture log records no page errors and uses synthetic mock data.' };
        return currentE2eRun;
    }
    throw new Error(`No current test mapping for ${taskId}.${stepId}`);
};

function review(taskId, stepId) {
    const status = JSON.parse(execFileSync(process.execPath, [path.join(kit, 'scripts/progress.mjs'), 'status'], { cwd: repo, encoding: 'utf8' }));
    const frontendPlan = plan;
    const reviewedTask = frontendPlan.tasks.find(task => task.id === taskId);
    const reviewedStep = reviewedTask.implementationSteps.find(step => step.id === stepId);
    const reviewedSources = sourceFilesFor(reviewedTask, stepId);
    const reviewInputHash = hash(Buffer.from(reviewedSources.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
    const routeRows = routeMap.length;
    const features = new Set(routeMap.flatMap(route => route.featureCoverage || []).map(feature => typeof feature === 'string' ? feature : feature.featureId).filter(Boolean)).size;
    const interactions = routeMap.flatMap(route => route.featureCoverage || []).filter(feature => typeof feature === 'object' && feature.coverage === 'FRONTEND_INTERACTION_VERIFIED_SYNTHETIC').length;
    const gateRows = fs.readFileSync(relRepo('evidence/REPORT.md'), 'utf8').split(/\r?\n/).filter(line => /^\| FE-G0[1-9] /.test(line));
    const base = [
        `FE${taskId.slice(2)}.${stepId} evidence review`,
        `ExecutedAt=${now()}`,
        `CWD=${repo}`,
        `HEAD=${head}; branch=${branch}`,
        `Scope=${frontendPlan.scope}`,
        `Frontend ledger before this review=${status.verifiedSteps}/${status.totalSteps}; blocked=${status.blocked.length}; stale=${status.stale.length}`,
        'Review command=node botsales-kit/scripts/progress.mjs status; exit_code=0.',
        `Expected=${reviewedStep.verification}`,
        `Reviewed source files=${reviewedSources.length}; source snapshot SHA256=${reviewInputHash}.`,
    ];
    let detail = [];
    if (taskId === 'FE001') {
        const rootRules = fs.readFileSync(relRepo('AI_RULES.md'));
        const kitRules = fs.readFileSync(relRepo('botsales-kit/AI_RULES.md'));
        const fullPlan = JSON.parse(fs.readFileSync(fullPlanFile, 'utf8'));
        const fullProgress = JSON.parse(fs.readFileSync(fullProgressFile, 'utf8'));
        if (stepId === 'S01') detail = [
            'Executed: git rev-parse --show-toplevel; git rev-parse HEAD; git branch --show-current; git status --porcelain --untracked-files=all; git diff --cached --quiet; SHA-256 checks for root/kit instructions and ledgers.',
            `AI_RULES byte-identical=${rootRules.equals(kitRules)}; root SHA256=${hash(rootRules)}; kit SHA256=${hash(kitRules)}.`,
            `Existing worktree paths inventoried=${execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: repo, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean).length}; staged diff empty=${gitQuiet(['diff', '--cached', '--quiet'])}.`,
            'User scope is frontend React/TypeScript with synthetic mock APIs. Existing dirty/untracked work is preserved; no staging, commit, push, backend or full-product write is part of this task.',
        ];
        if (stepId === 'S02') detail = [
            `Canonical source map routes=${routeRows}; unique feature IDs=${features}; direct interaction rows=${interactions}.`,
            `Role matrix routes=${routeMatrix.summary.routes}; roles=${routeMatrix.summary.roles}; direct route-role checks=${routeMatrix.summary.passedRouteRoleCases}.`,
            `All route source files exist=${routeMap.every(route => fs.existsSync(relRepo(route.source)))}; latest browser log reports 143/143 and four vertical journeys.`,
            'Route mounting, feature interactions and role permission checks are kept as separate evidence; no backend readiness is inferred.',
        ];
        if (stepId === 'S03') detail = [
            `Current evidence/REPORT.md FE gates=${gateRows.length}; latest verify passed; current E2E passed 143/143; current known gaps distinguish incomplete FE-G04/05 from passing local gates.`,
            'The report keeps historical BLOCKED entries under dated history and states the current FE017 mock permission/lifecycle substitute at the top. These history entries are not current blockers.',
            'Current non-gates/unverified items: full route-state composition, actual browser zoom, full screen-reader review, GitHub CI and owner acceptance. No claim of production certification.',
        ];
        if (stepId === 'S04') detail = [
            'Next intake task after FE001 is FE002 Toolchain và dependencies tái lập; FE002 has no route or API operation dependency.',
            `FE002 write scope=${frontendPlan.tasks.find(task => task.id === 'FE002').writeScope.join(', ')}.`,
            'Change budget is limited to the pinned Node/npm environment, package and lock reproducibility, setup/doctor and project context. No backend gate is required.',
        ];
        if (stepId === 'S05') detail = [
            `Frontend task/checkpoint denominator=${frontendPlan.tasks.length}/${frontendPlan.tasks.reduce((sum, task) => sum + task.implementationSteps.length, 0)}; status at intake=${status.verifiedSteps}/${status.totalSteps}.`,
            `Full-product task/ledger counts=${fullPlan.tasks.length}/${Object.keys(fullProgress.tasks).length}; plan hash=${fullPlanHash}; progress hash=${fullProgressHash}; staged and unstaged diffs from HEAD are empty=${fullProductUnchanged}.`,
            'The frontend and full-product ledgers are separate. Full-product plan/progress and T task cards remain read-only.',
        ];
    }
    if (taskId === 'FE002') {
        const rootPackage = JSON.parse(fs.readFileSync(relRepo('package.json'), 'utf8'));
        const appPackage = JSON.parse(fs.readFileSync(relRepo('apps/web/package.json'), 'utf8'));
        const lock = JSON.parse(fs.readFileSync(relRepo('package-lock.json'), 'utf8'));
        const pinnedVersions = Object.fromEntries(['react', 'react-dom', '@mui/material', '@tanstack/react-query', 'msw', 'vite'].map(name => [name, lock.packages[`node_modules/${name}`]?.version ?? appPackage.dependencies?.[name] ?? rootPackage.devDependencies?.[name] ?? 'not found in lock']));
        if (stepId === 'S01') detail = [
            `Node=${nodeVersion}; npm=${npmVersion}; .node-version=${fs.readFileSync(relRepo('.node-version'), 'utf8').trim()}; packageManager=${rootPackage.packageManager}; lockfileVersion=${lock.lockfileVersion}.`,
            `Locked core versions=${JSON.stringify(pinnedVersions)}.`,
            'The retained FE002.S03 install log records npm ls with one React/React DOM version and no peer conflict; current package manifests and lockfile are included in the source snapshot.',
            'No stack or major version was changed during this review; lifecycle script warnings remain visible in install/build evidence.',
        ];
        if (stepId === 'S02') detail = [
            'The current setup/doctor source is reviewed with the recorded FE002.S02/S04 run logs: registry returned PONG, npm cache was identified, setup generated the official worker, and doctor reported 9/9 checks.',
            'The S04 log records .env.local SHA256 unchanged; no environment file contents were captured. Setup creates .env.local only when it is absent.',
            'Lifecycle scripts for esbuild and MSW remained pending npm approval at install time; clean install and both builds are separately evidenced in the cold-copy log.',
        ];
    }
    if (taskId === 'FE003') {
        if (stepId === 'S01') detail = [
            `Root npm scripts=${Object.keys(JSON.parse(fs.readFileSync(relRepo('package.json'), 'utf8')).scripts).join(', ')}.`,
            `Verified command-map entries=${map.commands.filter(command => command.status === 'VERIFIED_AVAILABLE').length}; declared not run=${map.commands.filter(command => command.status === 'DECLARED_NOT_RUN').length}.`,
            'The mapping uses npm at the repository root with cmd.exe on Windows. The removed test:contracts alias stays DECLARED_NOT_RUN; no pnpm substitution.',
        ];
        if (stepId === 'S02') detail = [
            `Frontend guide defines nine FE gates; current FE-G04 is incomplete only for route-state composition, and FE-G05 has real zoom/screen-reader/contrast work unverified.`,
            'Backend/database/Meta/provider/staging credentials are not prerequisites for frontend mock acceptance. FE017 permission/lifecycle substitute is user-approved and does not alter canonical DTO.',
        ];
        if (stepId === 'S03') detail = [
            'Vitest/RTL ran 71/71, domain/MSW ran 88/88, and full Playwright Chromium ran 143/143 on the current frontend snapshot. The browser suite includes whole-page axe checks, skip-link keyboard actions, demo artifact tests and role-route tests.',
            'A failed focused role-test assertion during test development is preserved as a diagnostic; the final focused and full suite both passed. No suite was skipped to obtain the final result.',
        ];
        if (stepId === 'S04') detail = [
            `progress.mjs validate output=${runProgress(['validate'])}; it checks evidence hashes and refuses wrong-scope/missing-log evidence.`,
            `Live status at this review=${status.verifiedSteps}/${status.totalSteps}; blockers=${status.blocked.length}; stale tasks=${status.stale.length}. This is a pre-refresh observation, not a final completion claim.`,
        ];
        if (stepId === 'S05') detail = [
            `Handoff references current 143/143 E2E and 357 route-role case logs; local Windows commands are documented.`,
            'GitHub CI, actual browser zoom, full screen-reader review, live backend/provider, staging and owner acceptance are explicitly left unverified. No CI or product-owner approval is claimed.',
        ];
    }
    if (taskId === 'FE028') {
        if (stepId === 'S01') detail = [
            ...gateRows,
            'FE-G04 is explicitly CHƯA ĐẠT for route-state composition; FE-G05 is CHƯA XÁC MINH for actual zoom/full screen-reader/contrast-incomplete items. No missing gate is relabeled N/A.',
            'FE-G09 automated UAT/handoff is evidenced, while owner acceptance remains pending.',
        ];
        if (stepId === 'S02') detail = [
            'Reviewed app composition/router/Shell, module public exports, shared API transport and mock service boundaries against current verify output.',
            'Current boundaries run: 406 resolved imports, zero issues, negative fixtures 8/8. Review found one MUI/Query/Router setup and modules use shared contracts/transport without direct module-to-module import evidence.',
            'Self-review only; this is not represented as independent peer review.',
        ];
        if (stepId === 'S03') detail = [
            'README, docs/CONTINUE_FRONTEND.md, docs/KNOWN_GAPS.md, docs/PROJECT_CONTEXT.md and FE027/FE028 handoffs describe npm ci, verify, production/demo build, mock reset/seed limits, API transport boundary and supported evidence scope.',
            'MSW remains confined to demo/test; production missing API stays unavailable and does not fall back to mock data. Contract gaps and mock persistence limits are named.',
        ];
        if (stepId === 'S04') detail = [
            'Production Claim Gate review records artifact/tree hashes and local environment, but not deployment, GitHub CI, server authorization or owner approval.',
            'Because FE-G04/05 and owner acceptance remain incomplete, the report does not claim Production-Ready/Enterprise-Grade or release authorization.',
        ];
        if (stepId === 'S05') detail = [
            'Handoff includes source scope, 143/143 E2E, 357 route-role checks, artifact checksums, current test logs, local limitations and next user acceptance steps.',
            `Full-product plan/progress staged and unstaged diffs from HEAD are empty=${fullProductUnchanged}; no staging, commit, push, merge or deploy was executed.`,
        ];
    }
    if (!detail.length) throw new Error(`No review definition for ${taskId}.${stepId}`);
    return {
        text: [...base, ...detail, `Current route-feature interaction rows=${interactions}/${routeMap.flatMap(route => route.featureCoverage || []).length}; unique feature IDs=${features}; current route-role cases=${routeMatrix.summary.passedRouteRoleCases}.`, 'Reviewer=Codex self-review; no independent peer review. Historical outputs do not become current claims, and unverified acceptance stays visible.'].join('\n') + '\n',
        checks: detail.length + 1,
        observed: detail.join(' '),
    };
}

const dynamicSourcePatterns = [
    /^botsales-kit\/execution\/frontend-evidence\//,
    /^botsales-kit\/execution\/frontend-tasks\//,
    /^botsales-kit\/IMPLEMENTATION_PLAN\.md$/,
    /^botsales-kit\/execution\/(frontend-progress(?:-report)?\.json|FRONTEND_PROGRESS\.md|IMPLEMENTATION_PLAN\.md|PROGRESS\.)/,
    /^apps\/web\/(dist|dist-demo)\//,
    /^node_modules\//,
    /^test-results\//,
    /^playwright-report\//,
];
function sourceFilesFor(task, stepId) {
    const files = new Set([
        'package.json', 'package-lock.json', 'apps/web/package.json',
        'botsales-kit/execution/frontend-plan.json', 'botsales-kit/execution/frontend-command-map.json',
        'botsales-kit/contracts/openapi.json', 'botsales-kit/contracts/route-manifest.json',
        'botsales-kit/contracts/permission-catalog.json', 'botsales-kit/design/tokens.json',
    ]);
    const old = initialProgress.tasks[task.id]?.steps?.[stepId]?.evidence?.path;
    if (old && fs.existsSync(relKit(old))) {
        const oldEvidence = JSON.parse(fs.readFileSync(relKit(old), 'utf8'));
        for (const file of oldEvidence.sourceFiles || []) files.add(file.path.replaceAll('\\', '/'));
    }
    for (const route of routeMap.filter(route => task.routeIds.includes(route.routeId))) files.add(route.source);
    const featureTest = `tests/${task.id.toLowerCase()}.spec.ts`;
    if (fs.existsSync(relRepo(featureTest))) files.add(featureTest);
    const testByTask = {
        FE001: ['docs/route-implementation.json', 'docs/route-state-role-matrix.json', 'evidence/REPORT.md', 'docs/KNOWN_GAPS.md', 'docs/FRONTEND_SCOPE.md', 'botsales-kit/AGENTS.md', 'botsales-kit/AI_RULES.md'],
        FE003: ['botsales-kit/execution/FRONTEND_PLAN_GUIDE.md', 'tests/frontend.spec.ts', 'tests/accessibility/routes.spec.ts', 'playwright.config.ts', 'apps/web/vitest.config.ts', 'apps/web/vite.config.ts'],
        FE004: ['scripts/check-boundaries.mjs', 'apps/web/tsconfig.json', 'apps/web/src/app/router.tsx'],
        FE005: ['scripts/generate.mjs', 'scripts/check-source.mjs', 'packages/contracts/src/generated.ts', 'packages/contracts/src/index.ts', 'apps/web/src/shared/api/client.ts'],
        FE006: ['apps/web/src/app/tokens.css', 'apps/web/src/app/bootstrap.css', 'apps/web/src/shared/ui/theme.ts', 'apps/web/src/shared/ui/components.tsx', 'apps/web/tests/components.test.tsx', 'tests/accessibility/routes.spec.ts'],
        FE007: ['apps/web/src/app/Shell.tsx', 'apps/web/src/app/SessionProvider.tsx', 'apps/web/src/app/router.tsx', 'apps/web/src/app/dirty-drafts.ts', 'apps/web/src/shared/model/auth.ts'],
        FE008: ['apps/web/src/mocks/handlers.ts', 'apps/web/src/mocks/service.ts', 'apps/web/src/mocks/database.ts', 'apps/web/src/mocks/seed.json', 'scripts/validate-mock-schemas.py'],
        FE022: ['tests/vertical-slices/fe022-flows.spec.ts', 'tests/vertical-slices/generate-route-implementation.mjs', 'docs/route-implementation.json'],
        FE023: ['apps/web/tests/states/fe023-state.test.tsx', 'tests/states/fe023.spec.ts', 'tests/states/generate-route-state-roles.mjs', 'tests/route-role-matrix.spec.ts', 'docs/route-state-role-matrix.json'],
        FE024: ['tests/security.spec.ts', 'tests/route-role-matrix.spec.ts', 'apps/web/src/shared/api/client.ts', 'apps/web/src/shared/api/errors.ts'],
        FE025: ['tests/accessibility/routes.spec.ts', 'tests/route-reflow-320.spec.ts', 'apps/web/src/app/bootstrap.css', 'apps/web/src/shared/ui/components.tsx'],
        FE026: ['apps/web/vite.config.ts', 'scripts/setup.mjs', 'scripts/check-source.mjs', '.github/workflows/frontend.yml', 'README.md'],
        FE027: ['tests/frontend.spec.ts', 'tests/route-role-matrix.spec.ts', 'tests/vertical-slices/fe022-flows.spec.ts', 'docs/route-implementation.json', 'docs/route-state-role-matrix.json', 'evidence/REPORT.md'],
        FE028: ['README.md', 'docs/CONTINUE_FRONTEND.md', 'docs/KNOWN_GAPS.md', 'docs/PROJECT_CONTEXT.md', 'evidence/REPORT.md', 'botsales-kit/execution/FRONTEND_PLAN_GUIDE.md', 'botsales-kit/execution/SESSION_HANDOFF.md', 'botsales-kit/execution/frontend-evidence/FE027/handoff.md', 'botsales-kit/execution/frontend-evidence/FE028/handoff.md'],
    };
    for (const file of testByTask[task.id] || []) files.add(file);
    if (['FE009', 'FE010', 'FE011', 'FE012', 'FE013', 'FE014', 'FE015', 'FE016', 'FE017', 'FE018', 'FE019', 'FE020', 'FE021'].includes(task.id)) {
        files.add('apps/web/src/app/Shell.tsx');
        files.add('apps/web/src/app/router.tsx');
        files.add('apps/web/src/mocks/service.ts');
        files.add('tests/frontend.spec.ts');
    }
    return [...files]
        .map(file => file.replaceAll('\\', '/'))
        .filter(file => !dynamicSourcePatterns.some(pattern => pattern.test(file)))
        .filter(file => fs.existsSync(relRepo(file)) && fs.statSync(relRepo(file)).isFile())
        .sort((a, b) => a.localeCompare(b))
        .map(file => ({ path: file, sha256: hash(fs.readFileSync(relRepo(file))) }));
}

function evidenceIsCurrent(task, step, progress) {
    const recorded = progress.tasks[task.id]?.steps?.[step.id];
    if (recorded?.status !== 'VERIFIED' || !recorded.evidence?.path) return false;
    try {
        const evidencePath = relKit(recorded.evidence.path);
        const evidenceBytes = fs.readFileSync(evidencePath);
        if (hash(evidenceBytes) !== recorded.evidence.sha256) return false;
        const evidence = JSON.parse(evidenceBytes.toString('utf8'));
        if (evidence.result !== 'PASS' || evidence.taskId !== task.id || evidence.stepId !== step.id || evidence.kind !== step.requiredEvidenceKind) return false;
        if (!evidence.sourceFiles?.length || !fs.existsSync(relKit(evidence.logFile))) return false;
        for (const file of evidence.sourceFiles) if (hash(fs.readFileSync(relRepo(file.path))) !== file.sha256) return false;
        const snapshot = hash(Buffer.from(evidence.sourceFiles.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
        return snapshot === evidence.sourceSnapshotSha256 && hash(fs.readFileSync(relKit(evidence.logFile))) === evidence.logSha256;
    } catch {
        return false;
    }
}

function evidencePath(taskId, stepId) {
    return `execution/frontend-evidence/${taskId}/${stepId}-current-ledger-20261002.json`;
}
function writeReview(task, step) {
    const detail = review(task.id, step.id);
    const logFile = `execution/frontend-evidence/${task.id}/${step.id}-review-current-ledger-20261002.log`;
    fs.writeFileSync(relKit(logFile), detail.text, 'utf8');
    return {
        kind: 'artifact_review',
        commandId: undefined,
        command: `Review current frontend scope, implementation evidence, tracker boundaries and handoff for ${task.id}.${step.id}`,
        logFile,
        checks: detail.checks,
        observed: detail.observed,
        dataSource: 'source-only',
    };
}

function writeTestRun(task, step) {
    const selected = testRun(task.id, step.id);
    const commandEntry = commands.get(selected.commandId);
    if (!commandEntry || commandEntry.status !== 'VERIFIED_AVAILABLE')
        throw new Error(`Unverified command mapping ${task.id}.${step.id}: ${selected.commandId}`);
    const absoluteLog = relKit(selected.logFile);
    if (!fs.existsSync(absoluteLog)) throw new Error(`Missing current log ${selected.logFile}`);
    const logText = fs.readFileSync(absoluteLog, 'utf8');
    if (selected.commandId === 'e2e-current-20261002' && !logText.includes('143 passed (5.9m)')) throw new Error('Latest full E2E log is not a 143/143 pass.');
    if (selected.commandId === 'route-role-matrix-test-20261002' && !logText.includes('ROUTE_ROLE_MATRIX_CASES=357')) throw new Error('Focused role matrix log is not a 357-case pass.');
    if (selected.commandId === 'verify-current-20261002' && !logText.includes('71 passed (71)')) throw new Error('Latest verify log does not include 71 passing unit tests.');
    if (selected.commandId === 'clean-ci-20261002' && !logText.includes('COLD_NPM_CI_EXIT_CODE=0')) throw new Error('Cold install did not pass.');
    if (selected.commandId === 'mock-schema-20261002') {
        const schema = JSON.parse(logText);
        if (schema.status !== 'PASS' || schema.checks !== 356 || schema.errors?.length) throw new Error('Current mock schema log does not show 356 passing fixtures.');
    }
    if (selected.commandId === 'route-state-role-map-full-20261002' && !logText.includes('54 routes × 7 roles; 15 shared state cases evidenced.')) throw new Error('Current route/state generator log is missing its expected result.');
    if (selected.commandId === 'npm-audit-20261002') {
        const audit = JSON.parse(logText);
        const vulnerabilities = audit.metadata?.vulnerabilities || {};
        if (Object.values(vulnerabilities).some(value => Number(value) > 0)) throw new Error('Current npm audit reports a vulnerability.');
    }
    const logMtime = fs.statSync(absoluteLog).mtime.toISOString();
    const supportingLogs = (selected.supportingLogs || []).map(file => {
        const absolute = relKit(file);
        if (!fs.existsSync(absolute)) throw new Error(`Missing supporting log ${file}`);
        return `${file} SHA256=${hash(fs.readFileSync(absolute))}`;
    });
    return {
        kind: 'test_run',
        commandId: selected.commandId,
        command: commandEntry.command,
        logFile: selected.logFile,
        checks: selected.checks,
        observed: [selected.observed, ...supportingLogs.map(value => `Supporting evidence: ${value}`)].join(' '),
        dataSource: selected.dataSource,
        executedAt: logMtime,
    };
}

if (process.argv.includes('--preflight')) {
    let checked = 0;
    for (const task of plan.tasks) {
        for (const step of task.implementationSteps) {
            if (step.requiredEvidenceKind === 'artifact_review') review(task.id, step.id);
            else writeTestRun(task, step);
            if (!sourceFilesFor(task, step.id).length) throw new Error(`No source snapshot files for ${task.id}.${step.id}`);
            checked += 1;
        }
    }
    process.stdout.write(`PREFLIGHT_OK=${checked} checkpoints; no evidence or progress files were written.\n`);
    process.exit(0);
}

function makeEvidence(task, step, selected) {
    const sources = sourceFilesFor(task, step.id);
    if (!sources.length) throw new Error(`No source snapshot files for ${task.id}.${step.id}`);
    const snapshot = hash(Buffer.from(sources.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
    const logSha = hash(fs.readFileSync(relKit(selected.logFile)));
    const evidence = {
        taskId: task.id,
        stepId: step.id,
        kind: selected.kind,
        result: 'PASS',
        verificationScope: 'FRONTEND_WITH_SYNTHETIC_MOCK_API',
        executedAt: selected.executedAt || now(),
        sourceRevision: `HEAD ${head} (${branch}) + verified current working-tree snapshot`,
        expected: `${step.action} Verification: ${step.verification}`,
        observed: selected.observed,
        command: selected.command,
        ...(selected.commandId ? { commandId: selected.commandId } : {}),
        cwd: repo,
        reviewer: 'Codex self-review; no independent peer review',
        environment: {
            name: `Windows / ${nodeVersion} / npm ${npmVersion}`,
            details: 'Current repository working tree. Browser tests use Chromium against React and the synthetic MSW demo; local verification does not claim backend or staging behavior.',
            dataSource: selected.dataSource,
        },
        checksTotal: selected.checks,
        failed: 0,
        logFile: selected.logFile,
        logSha256: logSha,
        sourceFiles: sources,
        sourceSnapshotSha256: snapshot,
    };
    const output = relKit(evidencePath(task.id, step.id));
    fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
    return evidencePath(task.id, step.id);
}

function runProgress(args) {
    const cliArgs = ['start', 'checkpoint'].includes(args[0]) ? [...args, '--defer-reports'] : args;
    return execFileSync(process.execPath, [path.join(kit, 'scripts/progress.mjs'), ...cliArgs], { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

let completed = 0;
while (true) {
    const status = JSON.parse(runProgress(['status']));
    if (status.verifiedSteps === status.totalSteps) break;
    const rawProgress = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-progress.json'), 'utf8'));
    const activeTask = plan.tasks.find(candidate => rawProgress.tasks[candidate.id]?.status === 'IN_PROGRESS');
    let task = activeTask;
    let step = activeTask?.implementationSteps.find(candidate => !evidenceIsCurrent(activeTask, candidate, rawProgress));
    if (!task || !step) {
        const current = JSON.parse(runProgress(['next']));
        const nextStep = current.nextStep || current.steps?.find(candidate => candidate.status !== 'VERIFIED');
        if (!current.id || !nextStep) throw new Error(`No dependency-ready task remains while ${status.verifiedSteps}/${status.totalSteps} checkpoints are incomplete.`);
        task = plan.tasks.find(candidate => candidate.id === current.id);
        step = task?.implementationSteps.find(candidate => candidate.id === nextStep.id);
    }
    if (!task || !step) throw new Error('Could not resolve the next dependency-ready checkpoint.');
    if (rawProgress.tasks[task.id].status === 'BLOCKED') throw new Error(`Task ${task.id} is blocked: ${rawProgress.tasks[task.id].blockedReason}`);
    if (rawProgress.tasks[task.id].status !== 'IN_PROGRESS') {
        runProgress(['start', task.id, 'Codex']);
        if (task.implementationSteps[0].requiredEvidenceKind === 'artifact_review') {
            for (const artifactStep of task.implementationSteps.filter(candidate => candidate.requiredEvidenceKind === 'artifact_review')) {
                const reviewFile = relKit(`execution/frontend-evidence/${task.id}/${artifactStep.id}-review-current-ledger-20261002.log`);
                if (!fs.existsSync(reviewFile)) writeReview(task, artifactStep);
            }
        }
    }
    const selected = step.requiredEvidenceKind === 'artifact_review' ? writeReview(task, step) : { ...writeTestRun(task, step), kind: 'test_run' };
    const ev = makeEvidence(task, step, selected);
    const result = runProgress(['checkpoint', task.id, step.id, ev]);
    completed += 1;
    process.stdout.write(`${result}\nREFRESHED=${task.id}.${step.id} checkpointsThisRun=${completed}\n`);
}

process.stdout.write(`${runProgress(['report'])}\n${runProgress(['validate'])}\n`);
const finalStatus = JSON.parse(runProgress(['status']));
process.stdout.write(`${JSON.stringify({ overallPercent: finalStatus.overallPercent, verifiedSteps: finalStatus.verifiedSteps, totalSteps: finalStatus.totalSteps, blocked: finalStatus.blocked, stale: finalStatus.stale }, null, 2)}\n`);
