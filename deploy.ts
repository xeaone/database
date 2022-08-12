import { inc, ReleaseType } from 'https://deno.land/std@0.151.0/semver/mod.ts';

const { run, readTextFile, writeTextFile, args } = Deno;
const [ release ] = args;

if (!release) throw new Error('release required');

const f = await run({ cmd: [ 'git', 'fetch' ] }).status();
if (!f.success) throw new Error('git auth');

const n = await run({ cmd: [ 'npm', 'whoami' ] }).status();
if (!n.success) throw new Error('npm auth');

const pkg = JSON.parse(await readTextFile('./package.json'));
pkg.version = inc(pkg.version, release as ReleaseType);

await writeTextFile('./package.json', JSON.stringify(pkg, null, '    '));
await run({ cmd: [ 'git', 'commit', '-a', '-m', pkg.version ] }).status();
await run({ cmd: [ 'git', 'push' ] }).status();
await run({ cmd: [ 'git', 'tag', pkg.version ] }).status();
await run({ cmd: [ 'git', 'push', '--tag' ] }).status();
await run({ cmd: [ 'npm', 'publish', '--access', 'public' ] }).status();