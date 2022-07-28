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

### `type Data`
This is all the options for the data parameter. The `$` character marks a reserved property and will not be added to the database.
```ts
type Data = {

    // All: override on event
    $on?: boolean;

    // All Except Search:
    $id?: string;

    // Set: property name/s to increment
    // https://firebase.google.com/docs/firestore/reference/rest/v1/Write#FieldTransform.FIELDS.increment
    $increment?: Array<string>;

    // Set: property name/s to append missing elements
    // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/Write#FieldTransform.FIELDS.append_missing_elements
    $append?: Array<string>;

    // Custom Filters - START
    $startsWith?: Array<string>;
    // Custom Filters - END


    // Standard Filters - START

    // All Except Set:
    $in?: Array<string>;

    // All Except Set:
    $notIn?: Array<string>;

    // All Except Set: default
    $equal?: Array<string>;

    // All Except Set:
    $notEqual?: Array<string>;

    // All Except Set:
    $lessThan?: Array<string>;

    // All Except Set:
    $lessThanOrEqual?: Array<string>;

    // All Except Set:
    $arrayContains?: Array<string>;

    // All Except Set:
    $arrayContainsAny?: Array<string>;

    // All Except Set:
    $greaterThan?: Array<string>;

    // All Except Set:
    $greaterThanOrEqual?: Array<string>;

    // Standard Filters - End


    // Search: orders results by property name/s
    $ascending?: Array<string>; // All except Set:
    $descending?: Array<string>; // All except Set:

    // Search:
    // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.start_at
    $start?: Array<Record<string, Data>>;

    // Search:
    // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.end_at
    $end?: Array<Record<string, Data>>;

    // Search: The maximum number of results to return.
    // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.limit
    $limit?: number;

    // Search: The number of results to skip.
    // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.offset
    $offset?: number;

    [ key: string ]: any;
};
```

### `project(project: string): this`
Firestore project name.

### `key(key: string): this`
Firestore service key.

### `on (action: Action, collection: '*' | string, name: '*' | string, method: On): this`
```ts
database.on('create', '*', '*', data => {
    if (!data.account || typeof data.account !== 'string') throw new Error('account string required');
    if (!data.created || typeof data.created !== 'number') throw new Error('created number required');
    data.id = `${data.account}.${data.id ?? crypto.randomUUID()}`;
});
```

### `view(collection: string, data: Data)`
```ts
const user = await database.view('user', { id: '1' });
```

### `remove(collection: string, data: Data)`
```ts
const user = await database.remove('user', { id: '1' });
```

### `create(collection: string, data: Data)`
```ts
const user = await database.create('user', { id: '1', name: 'foo bar' });
```

### `update(collection: string, data: Data)`
```ts
const user = await database.update('user', { id: '1', age: 69 });
```

### `search(collection: string, data: Data)`
```ts
const users = await database.search('user', { age: 69 });
```

### `set(collection: string, data: Data)`
```ts
const user = await database.set('user', { id: '1', age: 1, $equal: [ 'id' ], $increment: [ 'age' ] });
```

<!--
Firestore reset api docs
https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents
-->