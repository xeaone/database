import { assert } from 'https://deno.land/std@0.209.0/assert/mod.ts';
import { REFERENCE } from '../src/util.ts';
import Database from '../src/mod.ts';

/**
 * deno task emulator
 * deno task test
 * @link https://cloud.google.com/firestore/docs/emulator
 */

const database = new Database();
database.project('test');
database.credential('application');
database.base('http://127.0.0.1:9000/v1');

const response = await fetch(`http://127.0.0.1:9000/emulator/v1/projects/test/databases/(default)/documents`, { method: 'DELETE' });
if (response.status !== 200) console.log(response.status, response.statusText, await response.text());

const id = crypto.randomUUID();
const opt = { sanitizeOps: false, sanitizeResources: false };

Deno.test('create identifier', opt, async () => {
    const result = await database.create('user', { name: 'foo' }).identifier(id).end();
    assert(result.name === 'foo');
    assert(result[REFERENCE]?.endsWith(id));
});

Deno.test('view identifier', opt, async () => {
    const result = await database.view('user').identifier(id).end();
    assert(result.name === 'foo');
    assert(result[REFERENCE]?.endsWith(id));
});

Deno.test('search query', opt, async () => {
    const results = await database.search('user').end();
    assert(results.length === 1);
    assert(results[0].name === 'foo');
    assert(results[0][REFERENCE]?.endsWith(id));
});

Deno.test('remove identifier', opt, async () => {
    const result = await database.remove('user').identifier(id).end();
    assert(result === undefined);
    const results = await database.search('user').end();
    assert(results.length === 0);
});
