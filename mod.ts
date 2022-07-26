import jwt from './jwt.ts';

import {
    Key,
    From,
    Value,
    Data,
    Direction,
    Rule, Method, Action,
    ResultArray, ResultRecord,
    EndAt, OrderBy, StartAt, Where, FieldFilter, Filters, Order, Options, Operator,
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

    constructor (options?: Options) {
        this.#key = this.#key ?? options?.key;
        this.#project = this.#project ?? options?.project;
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

    #order (key: string, direction: Direction): Order {
        return { field: { fieldPath: key }, direction };
    }

    #filter (operator: Operator, key: string, value: any): FieldFilter {
        return {
            fieldFilter: {
                op: operator,
                field: { fieldPath: key },
                value: this.#value(value),
            }
        };
    }

    #parse (value: any): any {
        const property = Object.keys(value).find(key => this.#properties.includes(key));

        if (property === 'nullValue') {
            value = null;
        } else if (property === 'booleanValue') {
            return value[ property ];
        } else if (property === 'integerValue') {
            return Number(value[ property ]);
        } else if (property === 'doubleValue') {
            return value[ property ];
        } else if (property === 'arrayValue') {
            return (value[ property ] && value[ property ].values || []).map(this.#parse.bind(this));
        } else if (property === 'mapValue') {
            return this.#parse(value[ property ] && value[ property ].fields || {});
        } else if (property === 'geoPointValue') {
            return { latitude: 0, longitude: 0, ...value[ property ] };
        } else if (property === 'timestampValue') {
            return new Date(value[ property ]);
        } else if (property === 'stringValue') {
            return value[ property ];
        } else if (value === undefined) {
            return undefined;
        } else if (property === 'referenceValue' || property === 'byteValue') {
            throw new Error(`${property} not implenmeted yet`);
        } else if (typeof value === 'object') {
            console.log(value);
            Object.keys(value).forEach(key => value[ key ] = this.#parse(value[ key ]));
        }

        return value;
    }

    async #query (collection: string, data: Data) {
        const filters: Filters = [];

        data.$startsWith?.forEach(key => {
            const start = data[ key ];
            const length = start.length;
            const startPart = start.slice(0, length - 1);
            const endPart = start.slice(length - 1, length);
            const end = startPart + String.fromCharCode(endPart.charCodeAt(0) + 1);
            filters.push(this.#filter('GREATER_THAN_OR_EQUAL', key, start));
            filters.push(this.#filter('LESS_THAN', key, end));
        });

        data.$in?.forEach(key => filters.push(this.#filter('IN', key, data[ key ])));
        data.$notIn?.forEach(key => filters.push(this.#filter('NOT_IN', key, data[ key ])));
        data.$equal?.forEach(key => filters.push(this.#filter('EQUAL', key, data[ key ])));
        data.$notEqual?.forEach(key => filters.push(this.#filter('NOT_EQUAL', key, data[ key ])));
        data.$lessThan?.forEach(key => filters.push(this.#filter('LESS_THAN', key, data[ key ])));
        data.$lessThanOrEqual?.forEach(key => filters.push(this.#filter('LESS_THAN_OR_EQUAL', key, data[ key ])));
        data.$arrayContains?.forEach(key => filters.push(this.#filter('ARRAY_CONTAINS', key, data[ key ])));
        data.$arrayContainsAny?.forEach(key => filters.push(this.#filter('ARRAY_CONTAINS_ANY', key, data[ key ])));
        data.$greaterThan?.forEach(key => filters.push(this.#filter('GREATER_THAN', key, data[ key ])));
        data.$greaterThanOrEqual?.forEach(key => filters.push(this.#filter('GREATER_THAN_OR_EQUAL', key, data[ key ])));

        if (!filters.length) throw new Error('Query - requires filters');

        const limit = 1;
        const from: From = [ { collectionId: collection } ];
        const where: Where = { compositeFilter: { op: 'AND', filters } };
        const body = { structuredQuery: { from, where, limit } };
        const query = await this.#fetch('POST', ':runQuery', body);

        const error = query[ 0 ]?.error;
        if (error) throw new Error(JSON.stringify(error, null, '\t'));

        const document = query[ 0 ]?.document;
        const name = document?.name ?? null;
        const result = document?.fields ?? null;

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
        if (method === 'GET' && result?.error?.code === 404) return null;

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

    async set<C extends string, D extends Data> (collection: C, data: D): Promise<void> {
        data = { ...data };

        if (data.$rule !== false) {
            this.#rule.get(`set.${collection}.*`)?.(data);
            this.#rule.get(`set.*.*`)?.(data);
            this.#rule.get(`*.*.*`)?.(data);
        }

        const fieldPaths: Array<string> = [];
        const fields: Record<string, Value> = {};
        let updateTransforms: Array<Record<string, string | Value>> | undefined;

        for (const key in data) {

            if (data.$rule !== false) {
                this.#rule.get(`set.${collection}.${key}`)?.(data);
                this.#rule.get(`set.*.${key}`)?.(data);
                this.#rule.get(`*.*.${key}`)?.(data);
            }

            const value = data[ key ];
            if (value === undefined) throw new Error(`Set - property ${key} undefined`);

            if (data.$append?.includes(key)) {
                updateTransforms = updateTransforms ?? [];
                updateTransforms.push({ fieldPath: key, appendMissingElement: this.#value(value) });
                continue;
            }

            if (data.$increment?.includes(key)) {
                updateTransforms = updateTransforms ?? [];
                updateTransforms.push({ fieldPath: key, increment: this.#value(value) });
                continue;
            }

            fieldPaths.push(key);
            fields[ key ] = this.#value(value);
        }

        const id = data.$id ?? crypto.randomUUID();
        const name = `projects/${this.#project}/databases/(default)/documents/${collection}/${id}`;
        const body = {
            writes: [ {
                updateTransforms,
                update: { fields, name },
                updateMask: { fieldPaths },
            } ]
        };

        await this.#fetch('POST', `:commit`, body);
    }

    async create<C extends string, D extends Data> (collection: C, data: D): Promise<ResultRecord> {
        data = { ...data };

        if (data.$rule !== false) {
            this.#rule.get(`create.${collection}.*`)?.(data);
            this.#rule.get(`create.*.*`)?.(data);
            this.#rule.get(`*.*.*`)?.(data);
        }

        const fields: Record<string, Value> = {};
        for (const key in data) {

            if (data.$rule !== false) {
                this.#rule.get(`create.${collection}.${key}`)?.(data);
                this.#rule.get(`create.*.${key}`)?.(data);
                this.#rule.get(`*.*.${key}`)?.(data);
            }

            const value = data[ key ];
            if (value === undefined) throw new Error(`Create - property ${key} undefined`);
            fields[ key ] = this.#value(value);
        }

        if (data.$id) {
            const post = await this.#fetch('POST', `/${collection}/?documentId=${data.$id}`, { fields });
            return post.fields ? this.#parse(post.fields) : null;
        }

        const { name } = await this.#query(collection, data);

        if (name) throw new Error('Create - document found'); // maybe null insted

        const post = await this.#fetch('POST', `/${collection}`, { fields });

        return this.#parse(post.fields);
    }

    async remove<C extends string, D extends Data> (collection: C, data: D): Promise<ResultRecord | null> {
        data = { ...data };

        if (data.$rule !== false) {
            this.#rule.get(`remove.${collection}.*`)?.(data);
            this.#rule.get(`remove.*.*`)?.(data);
            this.#rule.get(`*.*.*`)?.(data);
        }

        for (const key in data) {

            if (data.$rule !== false) {
                this.#rule.get(`remove.${collection}.${key}`)?.(data);
                this.#rule.get(`remove.*.${key}`)?.(data);
                this.#rule.get(`*.*.${key}`)?.(data);
            }

            const value = data[ key ];
            if (value === undefined) throw new Error(`Remove - property ${key} undefined`);
        }

        if (data.$id) {
            await this.#fetch('DELETE', `/${collection}/${data.$id}`);
            return null;
        }

        const { name, result } = await this.#query(collection, data);
        if (!name) return null;

        const id = name.split('/').slice(-1)[ 0 ];
        await this.#fetch('DELETE', `/${collection}/${id}`);

        return this.#parse(result);
    }

    async view<C extends string, D extends Data> (collection: C, data: D): Promise<ResultRecord | null> {
        data = { ...data };

        if (data.$rule !== false) {
            this.#rule.get(`view.${collection}.*`)?.(data);
            this.#rule.get(`view.*.*`)?.(data);
            this.#rule.get(`*.*.*`)?.(data);
        }

        for (const key in data) {

            if (data.$rule !== false) {
                this.#rule.get(`view.${collection}.${key}`)?.(data);
                this.#rule.get(`view.*.${key}`)?.(data);
                this.#rule.get(`*.*.${key}`)?.(data);
            }

            const value = data[ key ];
            if (value === undefined) throw new Error(`View - property ${key} undefined`);
        }

        if (data.$id) {
            const get = await this.#fetch('GET', `/${collection}/${data.$id}`);
            return get?.fields ? this.#parse(get?.fields) : null;
        }

        const { name, result } = await this.#query(collection, data);
        if (!name) return null;

        return this.#parse(result);
    }

    async update<C extends string, D extends Data> (collection: C, data: D): Promise<ResultRecord | null> {
        data = { ...data };

        if (data.$rule !== false) {
            this.#rule.get(`update.${collection}.*`)?.(data);
            this.#rule.get(`update.*.*`)?.(data);
            this.#rule.get(`*.*.*`)?.(data);
        }

        const fields: Record<string, Value> = {};
        let mask = '?currentDocument.exists=true';

        for (const key in data) {

            if (data.$rule !== false) {
                this.#rule.get(`update.${collection}.${key}`)?.(data);
                this.#rule.get(`update.*.${key}`)?.(data);
                this.#rule.get(`*.*.${key}`)?.(data);
            }

            mask += `&updateMask.fieldPaths=${key}`;

            const value = data[ key ];
            if (value === undefined) continue;

            fields[ key ] = this.#value(value);
        }

        if (data.$id) {
            const patch = await this.#fetch('PATCH', `/${collection}/${data.$id}${mask}`, { fields });
            return patch.fields ? this.#parse(patch.fields) : null;
        }

        const { name } = await this.#query(collection, data);
        if (!name) return null;

        const id = name.split('/').slice(-1)[ 0 ];
        const patch = await this.#fetch('PATCH', `/${collection}/${id}${mask}`, { fields });

        if (!patch.fields) return null;

        return this.#parse(patch.fields);
    }

    async search<C extends string, D extends Data> (collection: C, data: D): Promise<ResultArray> {
        data = { ...data };

        if (data.$rule !== false) {
            this.#rule.get(`search.${collection}.*`)?.(data);
            this.#rule.get(`search.*.*`)?.(data);
            this.#rule.get(`*.*.*`)?.(data);
        }

        const filters: Filters = [];
        for (const key in data) {

            if (data.$rule !== false) {
                this.#rule.get(`search.${collection}.${key}`)?.(data);
                this.#rule.get(`search.*.${key}`)?.(data);
                this.#rule.get(`*.*.${key}`)?.(data);
            }

            if (key.startsWith('$')) continue;

            const value = data[ key ];
            if (value === undefined) throw new Error(`Search - property ${key} undefined`);
        }

        let orderBy: OrderBy | undefined = [];
        let startAt: StartAt | undefined = { values: [] };
        let endAt: EndAt | undefined = { values: [] };

        data.$ascending?.forEach(key => orderBy?.push(this.#order(key, 'ASCENDING')));
        data.$descending?.forEach(key => orderBy?.push(this.#order(key, 'DESCENDING')));

        data.$start?.forEach(cursor => startAt?.values?.push(this.#value(cursor)));
        data.$end?.forEach(cursor => endAt?.values?.push(this.#value(cursor)));

        data.$startsWith?.forEach(key => {
            const start = data[ key ];
            const length = start.length;
            const startPart = start.slice(0, length - 1);
            const endPart = start.slice(length - 1, length);
            const end = startPart + String.fromCharCode(endPart.charCodeAt(0) + 1);
            filters.push(this.#filter('GREATER_THAN_OR_EQUAL', key, start));
            filters.push(this.#filter('LESS_THAN', key, end));
        });

        data.$in?.forEach(key => filters.push(this.#filter('IN', key, data[ key ])));
        data.$notIn?.forEach(key => filters.push(this.#filter('NOT_IN', key, data[ key ])));
        data.$equal?.forEach(key => filters.push(this.#filter('EQUAL', key, data[ key ])));
        data.$notEqual?.forEach(key => filters.push(this.#filter('NOT_EQUAL', key, data[ key ])));
        data.$lessThan?.forEach(key => filters.push(this.#filter('LESS_THAN', key, data[ key ])));
        data.$lessThanOrEqual?.forEach(key => filters.push(this.#filter('LESS_THAN_OR_EQUAL', key, data[ key ])));
        data.$arrayContains?.forEach(key => filters.push(this.#filter('ARRAY_CONTAINS', key, data[ key ])));
        data.$arrayContainsAny?.forEach(key => filters.push(this.#filter('ARRAY_CONTAINS_ANY', key, data[ key ])));
        data.$greaterThan?.forEach(key => filters.push(this.#filter('GREATER_THAN', key, data[ key ])));
        data.$greaterThanOrEqual?.forEach(key => filters.push(this.#filter('GREATER_THAN_OR_EQUAL', key, data[ key ])));

        if (!filters.length) throw new Error('Search - requires filters');

        orderBy = orderBy?.length ? orderBy : undefined;
        endAt = endAt?.values?.length ? endAt : undefined;
        startAt = startAt?.values?.length ? startAt : undefined;

        const limit: number | undefined = data.$limit;
        const offset: number | undefined = data.$offset;
        const from: From = [ { collectionId: collection } ];
        const where: Where = { compositeFilter: { op: 'AND', filters } };
        const body = { structuredQuery: { from, where, limit, offset, orderBy, startAt, endAt } };
        const query = await this.#fetch('POST', ':runQuery', body);

        if (query[ 0 ]?.error) throw new Error(JSON.stringify(query[ 0 ]?.error, null, '\t'));
        if (!query[ 0 ]?.document?.fields) return [];

        return query.map((entity: any) => this.#parse(entity.document.fields));
    }

}
