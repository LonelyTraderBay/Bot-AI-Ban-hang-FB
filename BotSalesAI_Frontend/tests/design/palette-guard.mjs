import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const APP_SOURCE = path.join(PROJECT_ROOT, 'apps/web/src');

export function readProjectFile(relativePath) {
    return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), 'utf8');
}

function sourceFiles(directory) {
    return fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) return sourceFiles(absolute);
        if (!/\.(?:css|js|jsx|ts|tsx)$/.test(entry.name)) return [];
        if (path.relative(APP_SOURCE, absolute).replaceAll('\\', '/') === 'app/tokens.css') return [];
        return [absolute];
    });
}

function inspectSource(source, relativePath, inspectThemeMode = false) {
    const findings = [];
    const hexPattern = /#[\da-f]{3,4}(?:[\da-f]{2}){0,2}\b/gi;
    for (const match of source.matchAll(hexPattern)) {
        const line = source.slice(0, match.index).split('\n').length;
        findings.push({ruleId:'design.literal-hex',path:relativePath,line,value:match[0]});
    }
    if ((inspectThemeMode && (/\bmode\s*:\s*(['"])(?:light|system)\1/i.test(source) || /\bsetMode\b/.test(source))) || /\b(?:colorSchemes|useColorScheme|ThemeModeContext)\b/.test(source) || /prefers-color-scheme/.test(source)) {
        findings.push({ruleId:'theme.non-dark-mode',path:relativePath,line:1});
    }
    return findings;
}

export function auditAppDesignSource({root = PROJECT_ROOT, fixtures = []} = {}) {
    const sourceRoot = path.join(root, 'apps/web/src');
    const findings = sourceFiles(sourceRoot).flatMap(absolute => {
        const relativePath = path.relative(root, absolute).replaceAll('\\', '/');
        return inspectSource(fs.readFileSync(absolute, 'utf8'), relativePath, relativePath === 'apps/web/src/shared/ui/theme.ts');
    });
    for (const fixture of fixtures) findings.push(...inspectSource(fixture.content, fixture.path, true));

    const authored = sourceFiles(sourceRoot).map(file => fs.readFileSync(file, 'utf8')).join('\n');
    const themeCount = [...authored.matchAll(/\bcreateTheme\s*\(/g)].length;
    const providerCount = [...authored.matchAll(/<ThemeProvider\b/g)].length;
    if (themeCount !== 1) findings.push({ruleId:'theme.single-owner',path:'apps/web/src',observed:themeCount});
    if (providerCount !== 1) findings.push({ruleId:'theme.single-provider',path:'apps/web/src',observed:providerCount});
    return findings;
}
