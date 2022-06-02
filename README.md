# X Database
A Deno Firestore database client. Coming Soon.

#scope
Creates a composite `Firestore id` using the `id` and `scope` properties. Property values must be a string type.

- View: Requires `id` and `scope` properties.
- Remove: Requires `id` and `scope` properties.
- Create: Requires `scope` properties.
- Update: Requires `id` and `scope` properties. Will not update `id` or `scope` properties. Throws and error if item does not exist.
- Set: NA
<!-- - Set: Requires `scope` properties. Will create a new item or update an existing item depending on composite `Firestore id`. -->
- Search: Requires `scope`.

#constant

- View: NA
- Remove: NA
- Create: Requires `constant` properties.
- Update: Requires `constant` properties. Will not update `constant` properties.
- Set: NA
- Search: NA