import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { inspectComposition } from '../../../../scripts/check-ui-composition.mjs';
import { auditAppDesignSource } from '../../../../scripts/check-visual-tokens.mjs';

// Audit fixtures only. The fixture files live in an isolated OS temporary directory;
// TypeScript uses a virtual source host. No application, checker or ledger is edited.
const directory = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(directory, '../../../..');
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'botsales-policy-enforcement-'));
const fixturePath = 'apps/web/src/shared/ui/__ui_policy_probe.tsx';
for (const folder of ['apps/web/src/shared/ui', 'apps/web/src/app', 'apps/web/src/modules', 'scripts']) fs.mkdirSync(path.join(temporaryRoot, folder), { recursive: true });
for (const file of ['apps/web/src/shared/ui/layout.ts', 'apps/web/src/app/tokens.css', 'scripts/layout-exceptions.schema.json']) fs.copyFileSync(path.join(project, file), path.join(temporaryRoot, file));
fs.writeFileSync(path.join(temporaryRoot, 'scripts/layout-exceptions.json'), JSON.stringify({ version: 1, exceptions: [] }));
const configFile = path.join(project, 'apps/web/tsconfig.json');
const config = ts.readConfigFile(configFile, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(configFile));
const cases = [
    { id: 'C01', purpose: 'Negative control: raw spacing', source: `import {Box} from '@mui/material'; export function UI(){return <Box p={2}/>;}` },
    { id: 'C02', purpose: 'Negative control: raw palette/typography', source: `export function UI(){return <div style={{fontSize:99,color:'#abc'}}/>;}` },
    { id: 'C03', purpose: 'Negative control: raw canonical form owner', source: `import {Stack} from '@mui/material';import {layoutSx} from './layout';export function UI(){return <Stack sx={layoutSx.form.fieldGap}/>;}` },
    { id: 'C04', purpose: 'Negative control: direct double inset', source: `import {FormFields} from './composition';import {Panel} from './components';export function UI(){return <Panel bodyMode="inset"><FormFields bodyMode="inset"/></Panel>;}` },
    { id: 'P01', purpose: 'Local MUI component alias bypasses system prop check', source: `import {Stack} from '@mui/material';const Row=Stack;export function UI(){return <Row p={2}/>;}` },
    { id: 'P02', purpose: 'Renamed styled import bypasses spacing and visuals', source: `import {styled as makeStyled} from '@mui/material/styles';const X=makeStyled('div')({padding:99,fontSize:99,color:'#abc'});export function UI(){return <X/>;}` },
    { id: 'P03', purpose: 'Local colors identifier is pretrusted', source: `const colors={danger:'#abc'};export function UI(){return <div style={{color:colors.danger}}/>;}` },
    { id: 'P04', purpose: 'Local theme identifier is pretrusted', source: `const theme={palette:{primary:{main:'#abc'}}};export function UI(){return <div style={{color:theme.palette.primary.main}}/>;}` },
    { id: 'P05', purpose: 'Local tokens identifier is pretrusted', source: `const tokens={fontSizes:{body:99}};export function UI(){return <div style={{fontSize:tokens.fontSizes.body}}/>;}` },
    { id: 'P06', purpose: 'Native JSX spread escapes visual walk', source: `export function UI(){return <div {...{style:{color:'#abc',fontSize:99}}}/>;}` },
    { id: 'P07', purpose: 'Font and border shorthand missing from TS visual property table', source: `export function UI(){return <div style={{font:'bold 99px Comic Sans MS',border:'7px solid #abc'}}/>;}` },
    { id: 'P08', purpose: 'Scoped local layoutSx shadows canonical import', source: `import {Box} from '@mui/material';import {layoutSx} from './layout';void layoutSx;export function UI(){const layoutSx={stats:{gutter:{gap:99}}};return <Box sx={layoutSx.stats.gutter}/>;}` },
    { id: 'P09', purpose: 'Canonical spacing object is mutable and assignments are not audited', source: `import {FormFields} from './composition';import {layoutSx} from './layout';layoutSx.form.fieldGap.gap=99;export function UI(){return <FormFields/>;}` },
    { id: 'P10', purpose: 'Local composition alias hides duplicated inset', source: `import {FormFields} from './composition';import {Panel} from './components';const Fields=FormFields;export function UI(){return <Panel bodyMode="inset"><Fields bodyMode="inset"/></Panel>;}` },
    { id: 'P11', purpose: 'Static element access hides role from composition memberPath', source: `import {Stack} from '@mui/material';import {layoutSx} from './layout';export function UI(){return <Stack sx={layoutSx['form']['fieldGap']}/>;}` },
    { id: 'P12', purpose: 'createElement owner bypass is outside JSX composition traversal', source: `import {createElement} from 'react';import {Stack} from '@mui/material';import {layoutSx} from './layout';export function UI(){return createElement(Stack,{sx:layoutSx.form.fieldGap});}` },
    { id: 'P13', purpose: 'Paper using form role escapes Stack/Box eligibility', source: `import {Paper} from '@mui/material';import {layoutSx} from './layout';export function UI(){return <Paper sx={{display:'flex',flexDirection:'column',...layoutSx.form.fieldGap}}/>;}` },
    { id: 'P14', purpose: 'bodyMode via a resolvable literal alias bypasses inset check', source: `import {FormFields} from './composition';import {Panel} from './components';const mode='inset' as const;export function UI(){return <Panel bodyMode={mode}><FormFields bodyMode={mode}/></Panel>;}` },
    { id: 'P15', purpose: 'Neutral wrapper hides ancestor-owned inset', source: `import {FormFields} from './composition';import {Panel} from './components';export function UI(){return <Panel bodyMode="inset"><div><FormFields bodyMode="inset"/></div></Panel>;}` },
    { id: 'P16', purpose: 'MUI GlobalStyles styles prop is not audited', source: `import {GlobalStyles} from '@mui/material';export function UI(){return <GlobalStyles styles={{body:{fontSize:99,color:'#abc',padding:99}}}/>;}` },
    { id: 'P17', purpose: 'JSX style tag text is outside CSS parser scope', source: `export function UI(){return <style>{'.x{font-size:99px;color:#abc;padding:99px}'}</style>;}` },
    { id: 'P18', purpose: 'Tagged styled CSS typography/color not parsed by visual checker', source: `import {styled} from '@mui/material/styles';const X=styled('div')\`font-size:99px;color:#abc;\`;export function UI(){return <X/>;}` },
    { id: 'P19', purpose: 'Noncanonical file named visual is trusted by suffix', source: `import {illegal} from './unrelated/visual';export function UI(){return <div style={{fontSize:illegal}}/>;}`, extra: [{ path: 'apps/web/src/shared/ui/unrelated/visual.ts', content: `export const illegal=99;` }] },
    { id: 'P20', purpose: 'Barrel import hides composition identity', source: `import {FormFields} from './policy-probe-barrel';import {Panel} from './components';export function UI(){return <Panel bodyMode="inset"><FormFields bodyMode="inset"/></Panel>;}`, extra: [{ path: 'apps/web/src/shared/ui/policy-probe-barrel.ts', content: `export {FormFields} from './composition';` }] },
    { id: 'P21', purpose: 'Undefined prefixed CSS variables and raw outline width are accepted', path: 'apps/web/src/app/__policy_probe.css', source: `.x{color:var(--color-unknown);font-size:var(--font-madeup);outline:123px solid var(--focus-ring-fake) var(--color-fake);}` },
    { id: 'P22', purpose: 'Named CSS color outside the short blacklist is accepted in TS', source: `export function UI(){return <div style={{color:'coral'}}/>;}` },
    { id: 'P23', purpose: 'Arithmetic consisting only of raw numbers is accepted as typography', source: `export function UI(){return <div style={{fontSize:50+49,lineHeight:1+2}}/>;}` },
    { id: 'P24', purpose: 'Dynamic computed visual property is not failed closed', source: `const key='fontSize';export function UI(){return <div style={{[key]:99}}/>;}` },
    { id: 'P25', purpose: 'Consumer can add a local raw number to canonical typography', source: `import{tokens}from'@botsales/tokens';export function UI(){return <div style={{fontSize:tokens.fontSizes.body+99}}/>;}` },
    { id: 'F01', purpose: 'False positive: closed geometry with as const fails composition', source: `import {FormFields} from './composition';export function UI(){return <FormFields geometry={{width:100} as const}/>;}` },
];

function runLayout(root, reportOnly = false) {
    const result = spawnSync(process.execPath, [path.join(project, 'scripts/check-layout.mjs'), '--root', root, '--json', ...(reportOnly ? ['--report'] : [])], { cwd: project, encoding: 'utf8', windowsHide: true });
    return { exit: result.status, report: JSON.parse(result.stdout), stderr: result.stderr };
}
function typecheck(source, extra = []) {
    const virtual = new Map([{ path: fixturePath, content: source }, ...extra].map(item => [path.resolve(project, item.path), item.content]));
    const host = ts.createCompilerHost(parsed.options);
    const originalGetSourceFile = host.getSourceFile.bind(host);
    const originalFileExists = host.fileExists.bind(host);
    const originalReadFile = host.readFile.bind(host);
    const originalDirectoryExists = host.directoryExists.bind(host);
    host.getSourceFile = (file, ...args) => virtual.has(path.resolve(file)) ? ts.createSourceFile(file, virtual.get(path.resolve(file)), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS) : originalGetSourceFile(file, ...args);
    host.fileExists = file => virtual.has(path.resolve(file)) || originalFileExists(file);
    host.readFile = file => virtual.get(path.resolve(file)) ?? originalReadFile(file);
    host.directoryExists = folder => [...virtual.keys()].some(file => file.startsWith(path.resolve(folder) + path.sep)) || originalDirectoryExists(folder);
    const program = ts.createProgram([path.resolve(project, fixturePath)], parsed.options, host);
    const diagnostics = ts.getPreEmitDiagnostics(program).map(item => ({ code: item.code, file: item.file && path.relative(project, item.file.fileName), message: ts.flattenDiagnosticMessageText(item.messageText, ' ') }));
    return { status: diagnostics.length ? 'FAIL' : 'PASS', diagnostics };
}
const results = [];
for (const item of cases) {
    const file = path.join(temporaryRoot, item.path || fixturePath);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, item.source);
    for (const extra of item.extra || []) { const extraFile = path.join(temporaryRoot, extra.path); fs.mkdirSync(path.dirname(extraFile), { recursive: true }); fs.writeFileSync(extraFile, extra.content); }
    const layout = runLayout(temporaryRoot);
    const composition = item.path?.endsWith('.css') ? { status: 'NOT_APPLICABLE', issues: [] } : (() => { const result = inspectComposition(item.source, fixturePath); return { status: result.issues.length ? 'FAIL' : 'PASS', issues: result.issues }; })();
    const visual = auditAppDesignSource({ root: temporaryRoot });
    const typing = item.path?.endsWith('.css') ? { status: 'NOT_APPLICABLE', diagnostics: [] } : typecheck(item.source, item.extra);
    results.push({ ...item, layout: { exit: layout.exit, status: layout.report.status, files: layout.report.files, findings: layout.report.findings }, composition, visual: { status: visual.status, files: visual.files, findings: visual.findings }, typing, threeSourceGatesPass: layout.exit === 0 && composition.status === 'PASS' && visual.status === 'PASS', threeSourceGatesAndTypecheckPass: layout.exit === 0 && composition.status === 'PASS' && visual.status === 'PASS' && typing.status === 'PASS', relevantSourceGatesPass: layout.exit === 0 && composition.status !== 'FAIL' && visual.status === 'PASS' });
    fs.unlinkSync(file);
    for (const extra of item.extra || []) fs.unlinkSync(path.join(temporaryRoot, extra.path));
}
// CLI report-mode evidence is diagnostic only: a FAIL report can legitimately exit 0.
fs.writeFileSync(path.join(temporaryRoot, fixturePath), cases[0].source);
const reportMode = runLayout(temporaryRoot, true);
fs.unlinkSync(path.join(temporaryRoot, fixturePath));
const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'botsales-policy-empty-'));
fs.mkdirSync(path.join(emptyRoot, 'scripts'), { recursive: true });
fs.mkdirSync(path.join(emptyRoot, 'apps/web/src/modules'), { recursive: true });
fs.copyFileSync(path.join(project, 'scripts/layout-exceptions.schema.json'), path.join(emptyRoot, 'scripts/layout-exceptions.schema.json'));
fs.writeFileSync(path.join(emptyRoot, 'scripts/layout-exceptions.json'), JSON.stringify({ version: 1, exceptions: [] }));
const emptyLayout = runLayout(emptyRoot);
const emptyVisual = auditAppDesignSource({ root: emptyRoot });
const emptyComposition = spawnSync(process.execPath, [path.join(project, 'scripts/check-ui-composition.mjs'), '--json'], { cwd: emptyRoot, encoding: 'utf8', windowsHide: true });
const emptyCompositionReport = JSON.parse(emptyComposition.stdout);
const hashedFiles = ['scripts/check-ui-composition.mjs', 'scripts/check-layout.mjs', 'scripts/check-visual-tokens.mjs', 'tests/ui-composition-checker.test.mjs', 'tests/layout-checker.test.mjs', 'tests/visual-token-checker.test.mjs', 'package.json', 'apps/web/tsconfig.json', 'apps/web/src/shared/ui/layout.ts', 'tests/ui-composition-layout.spec.ts', '../.github/workflows/frontend.yml'];
const hashes = hashedFiles.map(file => ({ file, sha256: createHash('sha256').update(fs.readFileSync(path.resolve(project, file))).digest('hex') }));
const report = { checkedAt: new Date().toISOString(), scope: 'Adversarial, isolated synthetic fixtures against current source gates and virtual TypeScript compilation. NOT npm verify, browser render, integration, hosted CI, or production certification. A gate bypass is a policy enforcement gap, not proof of a live UI defect.', temporaryRoot, emptyRoot, hashes, results, reportMode: { exit: reportMode.exit, status: reportMode.report.status, findingCount: reportMode.report.findings.length }, emptySource: { layout: { exit: emptyLayout.exit, status: emptyLayout.report.status, files: emptyLayout.report.files }, visual: { status: emptyVisual.status, files: emptyVisual.files }, composition: { exit: emptyComposition.status, status: emptyCompositionReport.status, files: emptyCompositionReport.files } }, summary: { cases: results.length, negativeControls: results.filter(item => item.id.startsWith('C')).length, bypassCases: results.filter(item => item.id.startsWith('P')).length, passAllThreeSourceGatesAndTypecheck: results.filter(item => item.id.startsWith('P') && item.threeSourceGatesAndTypecheckPass).length, cssRelevantGatesPass: results.filter(item => item.id.startsWith('P') && item.typing.status === 'NOT_APPLICABLE' && item.relevantSourceGatesPass).length, singleGateBypassesBlockedElsewhere: results.filter(item => item.id.startsWith('P') && !item.relevantSourceGatesPass).length, falsePositiveCases: results.filter(item => item.id.startsWith('F')).length } };
fs.writeFileSync(path.join(directory, 'probe-results.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report.summary, reportMode: report.reportMode, emptySource: report.emptySource, rows: results.map(item => ({ id: item.id, composition: item.composition.status, layout: item.layout.status, visual: item.visual.status, typecheck: item.typing.status })) }, null, 2));
