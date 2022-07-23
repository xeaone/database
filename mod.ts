import jwt from './jwt.ts';

import {
    Key,
    From,
    Value,
    Data, Options,
    Rule, Method, Action,
    ResultArray, ResultRecord,
    EndAt, OrderBy, StartAt, Where, FieldFilter, Filters, Order, OrderDirection, FieldFilterOperator,
} from './types.ts';

export default class Database {

    #key?: Key;
    #token?: string;
    #expires?: number;
    #project?: string;
    #rule: Map<string, Rule> = new Map();

    #properties = [
        'integerValue', 'doubleValue',
        'arrayValue', 'bytesValue', 'booleanValue', 'geoPointValue',
        'mapValue', 'nullValue', 'referenceValue', 'stringValue', 'timestampValue'
    ];

    // constructor (options?: Options) {
    //     this.#key = this.#key ?? options?.key;
    //     this.#project = this.#project ?? options?.project;
    // }

    #direction (direction: string): OrderDirection {
        if (/^a|ascending$/i.test(direction)) return 'ASCENDING';
        if (/^d|descending$/i.test(direction)) return 'DESCENDING';
        throw new Error(`direction ${direction} not valid`);
    }

    #operator (operator: string): FieldFilterOperator {

        if (/^i|in$/i.test(operator)) return 'IN';
        if (/^ni|not_?in$/i.test(operator)) return 'NOT_IN';

        if (/^e|equal$/i.test(operator)) return 'EQUAL';
        if (/^ne|not_?equal$/i.test(operator)) return 'NOT_EQUAL';

        if (/^l|less_?than$/i.test(operator)) return 'LESS_THAN';
        if (/^le|less_?than_?or_?equal$/i.test(operator)) return 'LESS_THAN_OR_EQUAL';

        if (/^ac|array_?contains$/i.test(operator)) return 'ARRAY_CONTAINS';
        if (/^aca|array_?contains_?any$/i.test(operator)) return 'ARRAY_CONTAINS_ANY';

        if (/^g|greater_?than$/i.test(operator)) return 'GREATER_THAN';
        if (/^ge|greater_?than_?or_?equal$/i.test(operator)) return 'GREATER_THAN_OR_EQUAL';

        throw new Error(`operator ${operator} not valid`);
    }

    #value (value: any): Value {
        if (value === null)
            return { nullValue: value };
        if (typeof value === 'string')
            return { stringValue: value };
        if (typeof value === 'boolean')
            return { booleanValue: value };
        if (typeof value === 'number' && value % 1 !== 0)
            return { doubleValue: value };
        if (typeof value === 'number' && value % 1 === 0)
            return { integerValue: `${value}` };
        if (value instanceof Date)
            return { timestampValue: value.toISOString() };
        if (value instanceof Array)
            return { arrayValue: { values: value.map(this.#value) } };
        if (typeof value === 'object')
            return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([ k, v ]) => [ k, this.#value(v) ])) } };
        throw new Error(`value not allowed ${value}`);
    }

    #order (key: string, direction: string): Order {
        return { field: { fieldPath: key }, direction: this.#direction(direction) };
    }

    #filter (operator: string, key: string, value: any): FieldFilter {
        return {
            fieldFilter: {
                field: { fieldPath: key },
                value: this.#value(value),
                op: this.#operator(operator),
            }
        };
    }

    #property (value: any) {
        return Object.keys(value).find(key => this.#properties.includes(key));
    }

    #parse (value: any) {
        const property = this.#property(value);

        if (property === 'nullValue') {
            value = null;
        } else if (property === 'integerValue') {
            value = Number(value[ property ]);
        } else if (property === 'doubleValue') {
            value = value[ property ];
        } else if (property === 'arrayValue') {
            value = (value[ property ] && value[ property ].values || []).map(this.#parse.bind(this));
        } else if (property === 'mapValue') {
            value = this.#parse(value[ property ] && value[ property ].fields || {});
        } else if (property === 'geoPointValue') {
            value = { latitude: 0, longitude: 0, ...value[ property ] };
        } else if (property === 'timestampValue') {
            value = new Date(value[ property ]);
        } else if (property) {
            value = value[ property ];
        } else if (value === undefined) {
            return;
        } else if (typeof value === 'object') {
            Object.keys(value).forEach(key => value[ key ] = this.#parse(value[ key ]));
        }

        return value;
    }

    // #handle (result: any): any {

    //     if (result.error) {
    //         throw new Error(JSON.stringify(result.error, null, '\t'));
    //     }

    //     if (result instanceof Array) {
    //         const skippedResults = result[ 0 ] && 'skippedResults' in result[ 0 ] ?
    //             result.splice(0, 1)[ 0 ].skippedResults : undefined;

    //         const formatted = [];
    //         for (const r of result) {
    //             const h = this.#handle(r);
    //             if (h) formatted.push(h);
    //         }

    //         return Object.defineProperties(
    //             formatted,
    //             { $offset: { value: skippedResults }, $skippedResults: { value: skippedResults }, $id: { value: 'test' } }
    //         );
    //     } else if (result.documents) {
    //         return result.documents.map(this.#handle);
    //     } else if (result.fields || result.document) {
    //         return this.#parse(result.fields || result.document.fields);
    //         // const fields = result.fields || result.document.fields;
    //         // const name = result.name || result.document.name;
    //         // const entity = this.#parse(fields);
    //         // entity[ ID ] = name.split('/').slice(-1)[ 0 ];
    //         // return entity;
    //         // return Object.defineProperties(
    //         //     this.#parse(fields),
    //         //     { $id: { value: name.split('/').slice(-1)[ 0 ] } }
    //         // );
    //     } else {
    //         // console.warn(result);
    //     }

    // }

    async #where (action: string, collection: string, options: any, filters: any[]) {
        const wheres = Object.keys(options.where);
        if (!wheres.length) throw new Error(`${action} - operators required`);
        if (filters.length !== wheres.length) throw new Error(`${action} - properties required ${wheres.join(', ')}`);

        const limit = 1;
        const from: From = [ { collectionId: collection } ];
        const where: Where = { compositeFilter: { op: 'AND', filters } };
        const body = { structuredQuery: { from, where, limit } };
        const query = await this.#fetch('POST', ':runQuery', body);

        const name = query?.[ 0 ]?.document?.name ?? null;
        const result = query?.[ 0 ]?.document?.fields ?? null;

        return { name, result };
    }

    async #auth () {
        if (!this.#key) throw new Error('key required');
        if (this.#expires && this.#expires >= Date.now()) return;

        const iss = this.#key.client_email;
        const iat = Math.round(Date.now() / 1000);
        const exp = iat + (30 * 60);
        const aud = 'https://oauth2.googleapis.com/token';
        const scope = 'https://www.googleapis.com/auth/datastore';
        const assertion = await jwt({ typ: 'JWT', alg: 'RS256', }, { exp, iat, iss, aud, scope }, this.#key.private_key);

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            body: [
                `assertion=${encodeURIComponent(assertion)}`,
                `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}`
            ].join('&'),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const result = await response.json();

        if (result.error) {
            throw new Error(JSON.stringify(result.error, null, '\t'));
        }

        this.#token = result.access_token;
        this.#expires = Date.now() + (result.expires_in * 1000);
    }

    async #fetch (method: Method, path: string, body?: any) {
        if (!this.#project) throw new Error('project required');

        await this.#auth();

        const response = await fetch(
            `https://firestore.googleapis.com/v1/projects/${this.#project}/databases/(default)/documents${path}`,
            {
                method,
                body: body ? JSON.stringify(body) : undefined,
                headers: { 'Authorization': `Bearer ${this.#token}` }
            }
        );

        const result = await response.json();

        // if (method === 'DELETE' && response.status === 200) return;
        // if (method === 'GET' && result?.error?.code === 404) return null;

        if (result.error) {
            throw new Error(JSON.stringify(result.error, null, '\t'));
        }

        return result;
    }

    key (data: Key): this {
        this.#key = data;
        return this;
    }

    project (data: string): this {
        this.#project = data;
        return this;
    }

    rule (action: Action, collection: '*' | string, name: '*' | string, method: Rule): this {
        this.#rule.set(`${action}.${collection}.${name}`, method);
        return this;
    }

    // review and test
    async set<C extends string, D extends Data, O extends Options> (collection: C, data: D, options: O = <O>{}): Promise<void> {

        if (options.rule !== false) {
            this.#rule.get(`set.${collection}.*`)?.(data, options);
            this.#rule.get(`set.*.*`)?.(data, options);
            this.#rule.get(`*.*.*`)?.(data, options);
        }

        const fieldPaths: Array<string> = [];
        const fields: Record<string, Value> = {};
        const updateTransforms: Array<Record<string, string | Value>> = [];

        for (const key in data) {

            if (options.rule !== false) {
                this.#rule.get(`set.${collection}.${key}`)?.(data, options);
                this.#rule.get(`set.*.${key}`)?.(data, options);
                this.#rule.get(`*.*.${key}`)?.(data, options);
            }

            // if (key === 'id') continue;

            const value = data[ key ];

            if (options.increment === key || options.increment?.includes(key)) {
                updateTransforms.push({ fieldPath: key, increment: this.#value(value) });
                continue;
            }

            if (value !== undefined) fields[ key ] = this.#value(value);

            fieldPaths.push(key);
        }

        const id = options.id ?? crypto.randomUUID();
        const path = `projects/${this.#project}/databases/(default)/documents/${collection}/${id}`;

        // might need to check results for errors
        await this.#fetch('POST', ':batchWrite', {
            writes: [ {
                updateTransforms,
                updateMask: { fieldPaths },
                update: { fields, name: path },
            } ]
        });

    }

    async create<C extends string, D extends Data, O extends Options> (collection: C, data: D, options: O = <O>{}): Promise<ResultRecord> {

        if (options.rule !== false) {
            this.#rule.get(`create.${collection}.*`)?.(data, options);
            this.#rule.get(`create.*.*`)?.(data, options);
            this.#rule.get(`*.*.*`)?.(data, options);
        }

        const filters = [];
        const fields: Record<string, Value> = {};
        for (const key in data) {

            if (options.rule !== false) {
                this.#rule.get(`create.${collection}.${key}`)?.(data, options);
                this.#rule.get(`create.*.${key}`)?.(data, options);
                this.#rule.get(`*.*.${key}`)?.(data, options);
            }

            const value = data[ key ];
            if (value === undefined) continue;
            fields[ key ] = this.#value(value);

            const operator = options.where?.[ key ];
            if (!operator) continue;
            if (typeof operator !== 'string') throw new Error(`Create - operator ${key} invalid`);
            filters.push(this.#filter(operator, key, value));
        }

        if (options.id && options.where) throw new Error('Create - property $id and $where found');
        if (!options.id && !options.where) throw new Error('Create - property $id or $where not found');

        if (options.id) {
            const post = await this.#fetch('POST', `/${collection}/?documentId=${options.id}`, { fields });
            return post.fields ? this.#parse(post.fields) : null;
        }

        const { name } = await this.#where('Create', collection, options, filters);

        if (name) throw new Error('Create - document found'); // maybe null insted

        const post = await this.#fetch('POST', `/${collection}`, { fields });

        return this.#parse(post.fields);
    }

    async remove<C extends string, D extends Data, O extends Options> (collection: C, data: D, options: O = <O>{}): Promise<ResultRecord | null> {

        if (options.rule !== false) {
            this.#rule.get(`remove.${collection}.*`)?.(data, options);
            this.#rule.get(`remove.*.*`)?.(data, options);
            this.#rule.get(`*.*.*`)?.(data, options);
        }

        const filters = [];
        for (const key in data) {

            if (options.rule !== false) {
                this.#rule.get(`remove.${collection}.${key}`)?.(data, options);
                this.#rule.get(`remove.*.${key}`)?.(data, options);
                this.#rule.get(`*.*.${key}`)?.(data, options);
            }

            const value = data[ key ];
            if (value === undefined) throw new Error(`Remove - property ${key} undefined`);

            const operator = options.where?.[ key ];
            if (!operator) continue;
            if (typeof operator !== 'string') throw new Error(`Remove - operator ${key} invalid`);
            filters.push(this.#filter(operator, key, value));
        }

        if (options.id && options.where) throw new Error('Remove - invalid format $id or $where');
        if (!options.id && !options.where) throw new Error('Remove - invalid format $id or $where');

        if (options.id) {
            await this.#fetch('DELETE', `/${collection}/${options.id}`);
            return null;
        }

        const { name, result } = await this.#where('Remove', collection, options, filters);

        if (!name) return null;

        const id = name.split('/').slice(-1)[ 0 ];
        await this.#fetch('DELETE', `/${collection}/${id}`);

        return this.#parse(result);
    }

    async view<C extends string, D extends Data, O extends Options> (collection: C, data: D, options: O = <O>{}): Promise<ResultRecord | null> {

        if (options.rule !== false) {
            this.#rule.get(`view.${collection}.*`)?.(data, options);
            this.#rule.get(`view.*.*`)?.(data, options);
            this.#rule.get(`*.*.*`)?.(data, options);
        }

        const filters = [];
        for (const key in data) {

            if (options.rule !== false) {
                this.#rule.get(`view.${collection}.${key}`)?.(data, options);
                this.#rule.get(`view.*.${key}`)?.(data, options);
                this.#rule.get(`*.*.${key}`)?.(data, options);
            }

            const value = data[ key ];
            if (value === undefined) throw new Error(`View - property ${key} undefined`);

            const operator = options.where?.[ key ];
            if (!operator) continue;
            if (typeof operator !== 'string') throw new Error(`View - operator ${key} invalid`);
            filters.push(this.#filter(operator, key, value));
        }

        if (options.id && options.where) throw new Error('View - invalid format $id or $where');
        if (!options.id && !options.where) throw new Error('View - invalid format $id or $where');

        if (options.id) {
            const get = await this.#fetch('GET', `/${collection}/${options.id}`);
            return get.fields ? this.#parse(get.fields) : null;
        }

        const { name, result } = await this.#where('View', collection, options, filters);

        if (!name) return null;

        return this.#parse(result);
    }

    async update<C extends string, D extends Data, O extends Options> (collection: C, data: D, options: O = <O>{}): Promise<ResultRecord | null> {

        if (options.rule !== false) {
            this.#rule.get(`update.${collection}.*`)?.(data, options);
            this.#rule.get(`update.*.*`)?.(data, options);
            this.#rule.get(`*.*.*`)?.(data, options);
        }

        const filters = [];
        const fields: Record<string, Value> = {};
        let mask = '?currentDocument.exists=true';

        for (const key in data) {

            if (options.rule !== false) {
                this.#rule.get(`update.${collection}.${key}`)?.(data, options);
                this.#rule.get(`update.*.${key}`)?.(data, options);
                this.#rule.get(`*.*.${key}`)?.(data, options);
            }

            mask += `&updateMask.fieldPaths=${key}`;

            const value = data[ key ];
            if (value === undefined) continue;

            fields[ key ] = this.#value(value);

            const operator = options.where?.[ key ];
            if (!operator) continue;
            if (typeof operator !== 'string') throw new Error(`Update - operator ${key} invalid`);
            filters.push(this.#filter(operator, key, value));

        }

        if (options.id && options.where) throw new Error('Update - invalid format $id or $where');
        if (!options.id && !options.where) throw new Error('Update - invalid format $id or $where');

        if (options.id) {
            const patch = await this.#fetch('PATCH', `/${collection}/${options.id}${mask}`, { fields });
            return patch.fields ? this.#parse(patch.fields) : null;
        }

        const { name } = await this.#where('Update', collection, options, filters);

        if (!name) return null;

        const id = name.split('/').slice(-1)[ 0 ];
        const patch = await this.#fetch('PATCH', `/${collection}/${id}${mask}`, { fields });

        if (!patch.fields) return null;

        return this.#parse(patch.fields);
    }

    async search<C extends string, D extends Data, O extends Options> (collection: C, data: D, options: O = <O>{}): Promise<ResultArray> {

        if (options.rule !== false) {
            this.#rule.get(`search.${collection}.*`)?.(data, options);
            this.#rule.get(`search.*.*`)?.(data, options);
            this.#rule.get(`*.*.*`)?.(data, options);
        }

        let orderBy: OrderBy | undefined;
        let startAt: StartAt | undefined;
        let endAt: EndAt | undefined;

        const token = options.token;
        for (const name in token) {
            const value = token[ name ];
            const direction = options.order?.[ name ] ?? 'ASCENDING';
            orderBy = orderBy ?? [];
            startAt = startAt ?? { values: [] };
            orderBy.push(this.#order(name, direction));
            startAt.values.push(this.#value(value));
        }

        const filters: Filters = [];
        for (const key in data) {

            if (options.rule !== false) {
                this.#rule.get(`search.${collection}.${key}`)?.(data, options);
                this.#rule.get(`search.*.${key}`)?.(data, options);
                this.#rule.get(`*.*.${key}`)?.(data, options);
            }

            const value = data[ key ];
            if (value === undefined) throw new Error(`Search - property ${key} undefined`);

            const operator = options.where?.[ key ];
            if (!operator) continue;
            if (typeof operator !== 'string') throw new Error(`Search - operator ${key} invalid`);

            if (/^(s|starts_?with)$/i.test(operator)) {
                const start = value;
                const length = start.length;
                const startPart = start.slice(0, length - 1);
                const endPart = start.slice(length - 1, length);
                const end = startPart + String.fromCharCode(endPart.charCodeAt(0) + 1);
                const direction = options.order?.[ key ] ?? 'ASCENDING';
                orderBy = orderBy ?? [];
                orderBy.push(this.#order(key, direction));
                filters.push(this.#filter('GREATER_THAN_OR_EQUAL', key, start));
                filters.push(this.#filter('LESS_THAN', key, end));
                continue;
            }

            filters.push(this.#filter(operator, key, value));
        }

        const wheres = Object.keys(options.where ?? {});
        if (!wheres.length) throw new Error('Search - operators required');
        if (filters.length !== wheres.length) throw new Error(`Search - properties required ${wheres.join(', ')}`);

        const limit: number | undefined = options.limit;
        const offset: number | undefined = options.offset;
        const from: From = [ { collectionId: collection } ];
        const where: Where = { compositeFilter: { op: 'AND', filters } };
        const body = { structuredQuery: { from, where, limit, offset, orderBy, startAt, endAt } };
        const query = await this.#fetch('POST', ':runQuery', body);

        return query?.map((entity: any) => this.#parse(entity.document.fields)) ?? [];
    }

}
