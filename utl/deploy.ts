import { ReleaseType } from 'https://deno.land/std@0.186.0/semver/mod.ts';
import { increment } from 'https://deno.land/std@0.186.0/semver/mod.ts';

const { readTextFile, writeTextFile, args } = Deno;
const [release] = args;

if (!release) throw new Error('release required');

const pkg = JSON.parse(await readTextFile('./package.json'));
pkg.version = increment(pkg.version, release as ReleaseType);

if (!pkg.version) throw new Error('release not valid');

const g = await (new Deno.Command('git', { args: ['fetch'] })).output();
if (!g.success) throw new Error('git auth');

const n = await (new Deno.Command('npm', { args: ['whoami'] })).output();
if (!n.success) throw new Error('npm auth');

await writeTextFile('./package.json', JSON.stringify(pkg, null, '    '));

await new Deno.Command('git', { args: ['commit', '-a', '-m', pkg.version] }).spawn().output();
await new Deno.Command('git', { args: ['push'] }).spawn().output();
await new Deno.Command('git', { args: ['tag', pkg.version] }).spawn().output();
await new Deno.Command('git', { args: ['push', '--tag'] }).spawn().output();
await new Deno.Command('npm', { args: ['publish', '--access', 'public'] }).spawn().output();
