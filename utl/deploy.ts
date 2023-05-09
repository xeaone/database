import { ReleaseType } from 'https://deno.land/std@0.186.0/semver/mod.ts';
import { increment } from 'https://deno.land/std@0.186.0/semver/mod.ts';

const { readTextFile, writeTextFile, args } = Deno;
const [release] = args;

if (!release) throw new Error('release required');

const g = await (new Deno.Command('git', { args: ['fetch'] })).output();
if (!g.success) throw new Error('git auth');

const n = await (new Deno.Command('npm', { args: ['whoami'] })).output();
if (!n.success) throw new Error('npm auth');

const pkg = JSON.parse(await readTextFile('./package.json'));
pkg.version = increment(pkg.version, release as ReleaseType);

await writeTextFile('./package.json', JSON.stringify(pkg, null, '    '));

await (new Deno.Command('git', { args: ['commit', '-a', '-m', pkg.version] })).output();
await (new Deno.Command('git', { args: ['push'] })).output();
await (new Deno.Command('git', { args: ['tag', pkg.version] })).output();
await (new Deno.Command('git', { args: ['push', '--tag'] })).output();
await (new Deno.Command('npm', { args: ['publish', '--access', 'public'] })).output();
