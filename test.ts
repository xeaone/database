import Database from './mod.ts';

// # FIRESTORE_PROJECT="echos-344816" \
// # FIRESTORE_KEY=`cat ../FirestoreKey.json` \

const compare = function (a: any, b: any) {
    a = a ?? {};
    b = b ?? {};
    const ak = Object.keys(a).sort().join(' ');
    const bk = Object.keys(b).sort().join(' ');
    const av = Object.values(a).sort().join(' ');
    const bv = Object.values(b).sort().join(' ');
    return ak === bk && av === bv;
};

const collection = 'users';
const project = 'qapi-351917';
const key = JSON.parse(Deno.readTextFileSync('/home/alex/.qapi-credentials/qapi-dev-key.json'));

const database = new Database();
database.key(key);
database.project(project);

database.rule('create', '*', '*', (data, options) => {
    options.where = { id: 'e', account: 'e' };
});

database.rule('remove', '*', '*', (data, options) => {
    options.where = { id: 'e', account: 'e' };
});

database.rule('update', '*', '*', (data, options) => {
    options.where = { id: 'e', account: 'e' };
});

database.rule('view', '*', '*', (data, options) => {
    options.where = { id: 'e', account: 'e' };
});

database.rule('search', '*', '*', (data, options) => {
    options.where = { account: 'e' };
});

const user: any = { id: '1', account: '1', firstName: 'foo', lastName: 'bar', num: 1, p: 2.2, bool: true, n: null };

const createUser = await database.create(collection, user);
if (!createUser) console.log('Create:', 'user already exists');
else console.log('Create:', 'user did not exist');

const viewUser = await database.view(collection, { id: user.id, account: user.account });
console.log('view', compare(viewUser, user));

user.num = 99;
user.n = undefined;
const updateUser = await database.update(collection, user);
delete user.n;
console.log('update', compare(updateUser, user), updateUser);

const searchUser = await database.search(collection, { account: user.account });
console.log('search', searchUser);

const removeUser = await database.remove(collection, { id: user.id, account: user.account });
console.log('remove', compare(removeUser, user));

// users[ 0 ].p = undefined;
// users[ 0 ].firstName = 'foo';
// await database.update(users[ 0 ], 'users');

// const search = await database.search('users', { account: '1' });
// console.log(search);

// const s = await database.search({
//     firstName: 'foo',
//     $limit: 1,
//     $startAt: { values: [ { stringValue: '' } ] },
//     $orderBy: [ { field: { fieldPath: 'index' } } ]
// }, 'users');
// console.log(s);



// const r = await database.search('users', {
//     firstName: 'foo',
//     $limit: 10,
//     $offset: 1,
//     $orderBy: [ { field: { fieldPath: 'index' } } ],
// });
// console.log(r);


// const user = await database.view('users', newUser[ database.ID ]);
// console.log(user, user[ database.ID ], user[ database.PATH ]);
