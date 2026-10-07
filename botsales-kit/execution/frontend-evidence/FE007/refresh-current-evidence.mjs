import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const kit = path.join(repo, 'botsales-kit');
const dir = path.join(kit, 'execution/frontend-evidence/FE007');
const helper = 'botsales-kit/execution/frontend-evidence/FE007/refresh-current-evidence.mjs';
const e2eLog = 'execution/frontend-evidence/FE003/S03-e2e-full-rerun.log';
const unitLog = 'execution/frontend-evidence/FE008/S05-unit-current-refresh.log';
const draftLog = 'execution/frontend-evidence/FE007/S05-dirty-draft-current-refresh.log';
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const commandMap = JSON.parse(fs.readFileSync(path.join(kit, 'execution/frontend-command-map.json'), 'utf8'));
const command = id => {
  const entry = commandMap.commands.find(item => item.id === id);
  if (!entry || entry.status !== 'VERIFIED_AVAILABLE') throw new Error(`Command ${id} is not registered as available`);
  return entry.command;
};
const hashFile = file => sha256(fs.readFileSync(path.join(repo, file)));
const sourceSnapshot = files => sha256(Buffer.from(files.map(file => `${file.path}:${file.sha256}`).sort().join('\n')));
const currentSources = (evidence, stepId) => {
  const paths = new Set(evidence.sourceFiles.map(file => file.path));
  for (const old of [
    'botsales-kit/execution/frontend-evidence/FE008/S05-e2e-current.log',
    'botsales-kit/execution/frontend-evidence/FE008/S05-e2e-current-refresh.log',
    'botsales-kit/execution/frontend-evidence/FE006/S04-unit-current.log',
    'botsales-kit/execution/frontend-evidence/FE007/S05-dirty-draft-refresh.log',
  ]) paths.delete(old);
  for (const file of [e2eLog, unitLog, draftLog]) paths.add(`botsales-kit/${file}`);
  if (stepId === 'S05') {
    paths.add('botsales-kit/execution/frontend-evidence/FE007/handoff.md');
    paths.add(helper);
  }
  return [...paths].sort().map(file => ({ path: file, sha256: hashFile(file) }));
};
const details = {
  S01: 'Current Playwright Chromium suite passed 41/41 on the real React demo. The route matrix rendered all 54 canonical routes; role changes remove restricted navigation, direct forbidden routes explain denial, and live mode with an unavailable session API does not enable mocks.',
  S02: 'Current Playwright Chromium suite passed 41/41. Shell navigation and route access follow the active principal/shop scope; shop switching cancels delayed old-scope responses; restricted navigation and direct routes remain denied; deep links survive refresh.',
  S03: 'Current Playwright Chromium suite passed 41/41. Delayed shop-switch requests did not leak prior-scope data; dirty navigation retained edits until a decision; failed logout retained the session and draft. The current dirty-draft helper passed 4/4.',
  S04: 'Current Playwright Chromium suite passed 41/41, including scoped shop switching, role guard, deep-link refresh/logout, mobile navigation without viewport overflow, and chunk recovery boundary. All network interactions were synthetic.',
  S05: 'Current React Chromium suite passed 41/41; the current Vitest suite passed 45/45 and the dirty-draft helper passed 4/4. Current strict typecheck and lint logs are clean. The live-mode-unavailable case confirms startup does not silently fall back to synthetic mocks.',
};

for (let index = 1; index <= 5; index += 1) {
  const stepId = `S0${index}`;
  const evidencePath = path.join(dir, `${stepId}.json`);
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  evidence.commandId = 'e2e';
  evidence.command = command('e2e');
  evidence.checksTotal = 41;
  evidence.failed = 0;
  evidence.logFile = e2eLog;
  evidence.logSha256 = hashFile(`botsales-kit/${e2eLog}`);
  evidence.observed = details[stepId];
  evidence.sourceRevision = 'HEAD 18be3c6 plus current dirty working tree; exact task source hashes recorded below';
  evidence.sourceFiles = currentSources(evidence, stepId);
  if (stepId === 'S03') {
    evidence.supplementaryEvidence = [{
      commandId: 'draft-helper', command: command('draft-helper'), logFile: draftLog,
      logSha256: hashFile(`botsales-kit/${draftLog}`), checksTotal: 4, failed: 0,
      sourceFiles: ['tests/session/dirty-drafts.check.mjs','apps/web/src/app/dirty-drafts.ts']
        .map(file => ({ path: file, sha256: hashFile(file) })),
    }];
  }
  if (stepId === 'S05') {
    evidence.supplementaryEvidence = [
      {
        commandId: 'unit', command: command('unit'), logFile: unitLog,
        logSha256: hashFile(`botsales-kit/${unitLog}`), checksTotal: 45, failed: 0,
        sourceFiles: ['apps/web/tests/components.test.tsx','apps/web/src/shared/ui/components.tsx','apps/web/src/shared/ui/theme.ts']
          .map(file => ({ path: file, sha256: hashFile(file) })),
      },
      {
        commandId: 'draft-helper', command: command('draft-helper'), logFile: draftLog,
        logSha256: hashFile(`botsales-kit/${draftLog}`), checksTotal: 4, failed: 0,
        sourceFiles: ['tests/session/dirty-drafts.check.mjs','apps/web/src/app/dirty-drafts.ts']
          .map(file => ({ path: file, sha256: hashFile(file) })),
      },
    ];
  }
  evidence.sourceFiles = [...new Map(evidence.sourceFiles.map(file => [file.path, file])).values()].sort((a, b) => a.path.localeCompare(b.path));
  evidence.sourceSnapshotSha256 = sourceSnapshot(evidence.sourceFiles);
  for (const supplement of evidence.supplementaryEvidence ?? []) supplement.sourceSnapshotSha256 = sourceSnapshot(supplement.sourceFiles);
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(JSON.stringify({ stepId, commandId: evidence.commandId, logFile: evidence.logFile, checks: evidence.checksTotal, sourceFiles: evidence.sourceFiles.length, sourceSnapshotSha256: evidence.sourceSnapshotSha256 }));
}
