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
    Create
*/
// const createUser = await database.create('users', { id: '1', num: 1, greet: 'hello world' }).equal({ id: '1' }).end();
// console.log('create', createUser);

/*
    Search
*/
// const searchUser = await database.search(collection).startsWith({ greet: 'hello' }).end();
// console.log('search', searchUser);

/*
    Update
*/
// const updateUser = await database.update('users', { num: 10 }).equal({ id: '1' }).end();
// console.log('update', updateUser);

/*
    View
*/
// const viewUser = await database.view('users').equal({ id: '1' }).end();
// console.log('view', viewUser);

/*
    Remove
*/
// const removeUser = await database.remove('users').equal({ id: '1' }).end();
// console.log('remove', removeUser);

/*
    Commit
*/
// const commitUser = await database.commit('users', { commit: 'c' }).identifier('31538b8d-410c-4a83-8c2c-671190df1bbd').increment({ num: 1 }).end();
// console.log('commit', commitUser);