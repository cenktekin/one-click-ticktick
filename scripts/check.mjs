#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildBundle } from './bundle-ff.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const PRIVACY_PATTERNS = [
    { name: 'absolute Windows path', re: /[A-Za-z]:[\\/](?:Users|projects)[\\/]/ },
    { name: 'absolute POSIX home path', re: /\/home\/[a-z0-9_-]+\//i },
    { name: 'personal username', re: /\bCenkT\b/ },
    { name: 'AMO API secret', re: /WEB_EXT_API_SECRET\s*[=:]\s*(?!x{4,}|<)[A-Za-z0-9]{16,}/ },
    { name: 'GitHub token', re: /gh[pous]_[A-Za-z0-9]{20,}/ },
    { name: 'OpenAI-style key', re: /sk-[A-Za-z0-9]{20,}/ },
    { name: 'Google API key', re: /AIza[0-9A-Za-z_-]{20,}/ }
];

const failures = [];

function fail(message) {
    failures.push(message);
    console.error(`FAIL  ${message}`);
}

function pass(message) {
    console.log(`ok    ${message}`);
}

function listSources() {
    const jsDir = join(ROOT, 'src', 'js');
    const files = readdirSync(jsDir)
        .filter(name => name.endsWith('.js'))
        .map(name => `src/js/${name}`);
    files.push('src/service-worker.js', 'src/background-ff.js');
    return files;
}

function isModule(source) {
    return /^\s*(import|export)\s/m.test(source);
}

for (const rel of listSources()) {
    const source = readFileSync(join(ROOT, rel), 'utf8');
    const args = isModule(source)
        ? ['--input-type=module', '--check']
        : ['--check', join(ROOT, rel)];
    const result = spawnSync(process.execPath, args, {
        input: isModule(source) ? source : undefined,
        encoding: 'utf8'
    });
    if (result.error || result.status !== 0) {
        fail(`syntax ${rel}: ${(result.stderr || result.error || '').trim()}`);
    } else {
        pass(`syntax ${rel}`);
    }
}

const expected = buildBundle();
const actual = readFileSync(join(ROOT, 'src', 'background-ff.js'), 'utf8');
if (expected !== actual) {
    fail('src/background-ff.js is stale - run `npm run bundle`');
} else {
    pass('src/background-ff.js matches modules');
}

const privacyTargets = [
    'README.md',
    'package.json',
    'src/manifest.json',
    'src/options.html',
    ...listSources()
];
for (const rel of privacyTargets) {
    const source = readFileSync(join(ROOT, rel), 'utf8');
    for (const { name, re } of PRIVACY_PATTERNS) {
        const hit = re.exec(source);
        if (hit) fail(`privacy ${rel}: ${name} (${hit[0]})`);
    }
}
if (!failures.some(f => f.startsWith('privacy '))) {
    pass(`privacy scan clean (${privacyTargets.length} files)`);
}

if (failures.length > 0) {
    console.error(`\n${failures.length} check(s) failed`);
    process.exit(1);
}
console.log('\nall checks passed');
