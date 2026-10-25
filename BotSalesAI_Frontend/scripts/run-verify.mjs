import { spawn } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Source/domain/build and isolated UI audits have separate outputs. Evidence reads both.
const lanes = [
    ['test:source', 'boundaries', 'lint', 'typecheck', 'test:domain', 'test', 'build'],
    ['test:layout', 'test:visual-tokens', 'test:ui-composition'],
];

async function runScript(script) {
    if (!process.env.npm_execpath) throw new Error('Run verification with npm run verify.');
    const started = performance.now();
    console.log('VERIFY_STEP_STARTED=' + script);
    return new Promise(resolve => {
        const chunks = [];
        const child = spawn(process.execPath, [process.env.npm_execpath, 'run', script], {
            env: process.env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
        });
        for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => chunks.push(chunk));
        child.on('error', error => chunks.push(Buffer.from(String(error) + '\n')));
        child.on('close', code => {
            // Flush one complete command at a time so concurrent JSON/test logs stay readable.
            process.stdout.write(Buffer.concat(chunks));
            console.log('VERIFY_STEP_FINISHED=' + JSON.stringify({ script, exitCode: code,
                seconds: (performance.now() - started) / 1000 }));
            resolve(code === 0 ? 0 : 1);
        });
    });
}

export async function runVerification(run = runScript) {
    if (await run('generate:check')) return 1;
    const results = await Promise.all(lanes.map(async scripts => {
        for (const script of scripts) if (await run(script)) return 1;
        return 0;
    }));
    if (results.some(code => code !== 0)) return 1;
    return await run('test:evidence') ? 1 : 0;
}

if (process.argv[1] && pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url)
    process.exitCode = await runVerification();
