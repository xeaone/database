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

// database.on('create', '*', '*', (data, options) => {
//     options.where = { id: 'e', account: 'e' };
// });

// database.on('remove', '*', '*', (data, options) => {
//     options.where = { id: 'e', account: 'e' };
// });

// database.on('update', '*', '*', (data, options) => {
//     options.where = { id: 'e', account: 'e' };
// });

// database.on('view', '*', '*', (data, options) => {
//     options.where = { id: 'e', account: 'e' };
// });

// database.on('search', '*', '*', (data, options) => {
//     options.where = { account: 'e' };
// });

// const user: any = { id: '1', account: '1', firstName: 'foo', lastName: 'bar', num: 1, p: 2.2, bool: true, n: null };

// const createUser = await database.create(collection, user);
// if (!createUser) console.log('Create:', 'user already exists');
// else console.log('Create:', 'user did not exist');

// const viewUser = await database.view(collection, { id: user.id, account: user.account });
// console.log('view', compare(viewUser, user));

// user.num = 99;
// user.n = undefined;
// const updateUser = await database.update(collection, user);
// delete user.n;
// console.log('update', compare(updateUser, user), updateUser);

// const searchUser = await database.search(collection, { account: user.account });
// console.log('search', searchUser);

// const removeUser = await database.remove(collection, { id: user.id, account: user.account });
// console.log('remove', compare(removeUser, user));


/*
    Search
*/
// const searchUser = await database.search(collection, { greet: 'hello', $startsWith: [ 'greet' ], $descending: [ 'greet' ] });
// const searchUser = await database.search(collection, { account: '2', $equal: [ 'account' ] });
// console.log('search', searchUser);


/*
    View
*/
// const viewIdUser = await database.view('users', { $id: '1000' }); // not exist
// console.log(viewIdUser);
// const viewWhereUser = await database.view('users', { account: '2', $equal: [ 'account' ] }); // should exists
// console.log(viewWhereUser);


/*
    Remove non exist
*/
// const removeIdUser = await database.remove('users', { $id: '1000' });
// console.log(removeIdUser);


/*
    Update
*/
// const updateUser = await database.update('users', { id: '2', num: 100 }, { where: { id: 'e' } });
// console.log('update', updateUser);


/*
    Set
*/
// const result = await database.set('users', { set: 'bar', inc: 10 }, { id: 'a422c84f-3e76-4a60-bf14-fb8749a15b68', increment: [ 'inc' ] });
// console.log(result);
const result = await database.set('users', { set: 'bar', inc: 1, ar: [ 2 ], $id: '8803823c-8cb4-4198-8880-7565ef09cbdd', $increment: [ 'inc' ], $append: [ 'ar' ] });
console.log(result);
