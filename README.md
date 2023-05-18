[![deno module](https://shield.deno.dev/x/xdatabase)](https://deno.land/x/xdatabase)
![deno compatibility](https://shield.deno.dev/deno/^1.33.3)

# X-Database

A Deno database client for Google Cloud Firestore.

## Example

```ts
import Database from "https://deno.land/x/xdatabase/src/mod.ts";

const database = new Database();

database.credential('application');
database.project('google-cloud-project-id');

const id = crypto.randomUUID();

const user = await database.create("user", {
  id,
  age: 20,
  phone: null,
  active: true,
  lastName: "bar",
  firstName: "foo",
}).identifier(id).end();

console.log(user);

const users = await database
  .search("user")
  .equal({ firstName: "foo" })
  .limit(10).end();

console.log(user);
```

## Auth
It is recommended to use the `'application'` String option this will use the Application Default Credential and will fallback to trying to use the Google Cloud service instance account credentials.
You can initialize the Application Default Credential using this command `gcloud auth application-default login`.
Alternatively you can pass a ServiceAccountCredentials key Object, ApplicationDefaultCredentials key Object, or the `'meta'` String.
The option to manually use `'meta'` is nice for production because the only deno permission you should need is network.

- `'application'` Deno permissions read
  - Windows: `%APPDATA%\gcloud\application_default_credentials.json`
  - Linux/Mac: `$HOME/.config/gcloud/application_default_credentials.json`
- `'meta'`
  - `http://metadata.google.internal`

## API

### `project(project: string): this`

Firestore project name.

### `key(key: string): this`

Firestore service key.

### `search(collection: string)`

```ts
const users = await database.search("user").equal({ id: "1" }).end();
```

### `view(collection: string)`

```ts
const user = await database.view("user").equal({ id: "1" }).end();
```

### `remove(collection: string)`

```ts
const user = await database.remove("user").identifier("1").end();
```

### `create(collection: string, data: Data)`

```ts
const user = await database.create("user", {
  id: "1",
  name: "foo bar",
  age: 42,
}).identifier("1").end();
```

### `update(collection: string, data: Data)`

```ts
const user = await database.update("user", { age: 69 }).equal({ id: "1" })
  .end();
```

### `commit(collection: string, data: Data)`

```ts
const user = await database.commit("user").equal({ id: "1" }).increment({
  age: 1,
}).end();
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
