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

const user = await database.create('users', {
    age: 20,
    phone: null,
    active: true,
    lastName: 'bar',
    firstName: 'foo',
});

console.log(user);

const users = await database.search('users', {
    $limit: 10,
    $offset: 1,
    firstName: 'foo',
});

console.log(user);
```

## API

### `project(project: string): this`
Firestore project name.

### `key(key: string): this`
Firestore service key.

### `rule (action: Action, collection: '*' | string, name: '*' | string, method: Rule): this`
```ts
database.rule('create', '*', '*', data => {
    if (!data.account || typeof data.account !== 'string') throw new Error('account string required');
    if (!data.created || typeof data.created !== 'number') throw new Error('created number required');
    data.id = `${data.account}.${data.id ?? crypto.randomUUID()}`;
});
```

### `view(collection: string, data: Record<string, any>)`
```ts
const user = await database.view('user', { id: '1' });
```

### `remove(collection: string, data: Record<string, any>)`
```ts
const user = await database.remove('user', { id: '1' });
```

### `create(collection: string, data: Record<string, any>)`
```ts
const user = await database.create('user', { id: '1', name: 'foo bar' });
```

### `update(collection: string, data: Record<string, any>)`
```ts
const user = await database.update('user', { id: '1', age: 69 });
```

### `set(collection: string, data: Record<string, any>)`

### `search(collection: string, data: Record<string, any>)`
```ts
const users = await database.search('user', {
    age: 69,

    /*
    $rule?: boolean; // disable rule
    $token?: Record<string, any>; // record to start the search pagination
    $operator?: Operator | Record<string, Operator>; // define operators
    $direction?: Direction | Record<string, Direction>; // order records

    $where?: any; // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.where
    $endAt?: any; // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.end_at
    $limit?: number; // Firestore: The maximum number of results to return. https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.limit
    $offset?: number; // Firestore: The number of results to skip. https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.offset

    $from?: From; // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.from
    $startAt?: StartAt; // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.start_at
    $orderBy?: OrderBy; // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.order_by
    */

});
```

<!-- ### `constant()`
- View: NA
- Remove: NA
- Create: Requires `constant` properties.
- Update: Will not update `constant` properties.
- Set: NA
- Search: NA

### `scope()`
Creates a composite `Firestore id` using the `id` and `scope` properties. Property values must be a string type.

- View: Requires `id` and `scope` properties.
- Remove: Requires `id` and `scope` properties.
- Create: Requires `scope` properties.
- Update: Requires `id` and `scope` properties. Will not update `id` or `scope` properties. Throws and error if item does not exist.
- Set: Requires `scope` properties. Will create a new item or update an existing item depending on composite `Firestore id`.
- Search: Requires `scope`. -->

<!--
Firestore reset api docs
https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents
-->