import Database from './mod.ts';

const project = Deno.env.get('FIRESTORE_PROJECT') ?? '';
const key = JSON.parse(Deno.env.get('FIRESTORE_KEY') ?? '');

const database = new Database();
database.key(key);
database.project(project);

const newUser = await database.create('users', { firstName: 'foo', lastName: 'bar', num: 1, p: 2.2, bool: true, n: null });
console.log(newUser, newUser.id);

// const users = await database.view('users');
// console.log(users);

// users[ 0 ].p = undefined;
// users[ 0 ].firstName = 'foo';
// await database.update(users[ 0 ], 'users');

// const search = await database.search('users', { account: '1' });
// console.log(search);

// const s = await database.search({
//     firstName: 'foo',
//     $limit: 1,
//     $orderBy: [ { field: { fieldPath: 'index' } } ]
// }, 'users');
// console.log(s);

const r = await database.search('users', {
    firstName: 'foo',
    $limit: 10,
    $offset: 1,
    $orderBy: [ { field: { fieldPath: 'index' } } ],
});
console.log(r);



// const user = await database.view('users', newUser[ database.ID ]);
// console.log(user, user[ database.ID ], user[ database.PATH ]);


