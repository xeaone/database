[![Total alerts](https://img.shields.io/lgtm/alerts/g/xeaone/database.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/xeaone/database/alerts/)
[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/xeaone/database.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/xeaone/database/context:javascript)

# X-Database
A Deno Firestore database client. Coming Soon.

## Example
```ts
import Database from 'https://deno.land/x/xdatabase/mod.ts';

const project = Deno.env.get('FIRESTORE_PROJECT') ?? '';
const key = JSON.parse(Deno.env.get('FIRESTORE_KEY') ?? '');

const database = new Database();

database.key(key);
database.project(project);

const id = crypto.randomUUID();

const user = await database.create('user', {
    id,
    age: 20,
    phone: null,
    active: true,
    lastName: 'bar',
    firstName: 'foo',
}).identifier(id).end();

console.log(user);

const users = await database
    .search('user')
    .equal({ firstName: 'foo' })
    .limit(10).end();

console.log(user);
```

## API

### `project(project: string): this`
Firestore project name.

### `key(key: string): this`
Firestore service key.

### `search(collection: string)`
```ts
const users = await database.search('user').equal({ id: '1' }).end();
```

### `view(collection: string)`
```ts
const user = await database.view('user').equal({ id: '1' }).end();
```

### `remove(collection: string)`
```ts
const user = await database.remove('user').identifier('1').end();
```

### `create(collection: string, data: Data)`
```ts
const user = await database.create('user', { id: '1', name: 'foo bar', age: 42 }).identifier('1').end();
```

### `update(collection: string, data: Data)`
```ts
const user = await database.update('user', { age: 69 }).equal({ id: '1' }).end();
```

### `commit(collection: string, data: Data)`
```ts
const user = await database.commit('user').equal({ id: '1' }).increment({ age: 1 }).end();
```

### `Options`
```ts
// All Except Search:
identifier(string)

// All Except Set: Property starts with filter
startsWith(Array<string>)

// All Except Set:
in(Array<string>)

// All Except Set:
notIn(Array<string>)

// All Except Set: default
equal(Array<string>)

// All Except Set:
notEqual(Array<string>)

// All Except Set:
lessThan(Array<string>)

// All Except Set:
lessThanOrEqual(Array<string>)

// All Except Set:
arrayContains(Array<string>)

// All Except Set:
arrayContainsAny(Array<string>)

// All Except Set:
greaterThan(Array<string>;

// All Except Set:
greaterThanOrEqual(Array<string>)

// Search: orders results by property name/s
ascending(Array<string>)
descending(Array<string>)

// Search:
// Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.start_at
start(Array<Record<string, Data>>)

// Search:
// Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.end_at
end(Array<Record<string, Data>>)

// Search: The maximum number of results to return.
// Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.limit
limit(number)

// Search: The number of results to skip.
// Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.offset
offset(number)

// Set: property name/s to increment
// https://firebase.google.com/docs/firestore/reference/rest/v1/Write#FieldTransform.FIELDS.increment
increment(Array<string>)

// Set: property name/s to append missing elements
// Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/Write#FieldTransform.FIELDS.append_missing_elements
append(Array<string>)
```
<!--
Firestore reset api docs
https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents
-->