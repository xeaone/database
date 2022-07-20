import jwt from './jwt.ts';

import {
    OrderFormat,
    ValueFormat,
    OperatorFormat,
    DirectionFormat
} from './format.ts';

import {
    Key,
    Rule,
    Value,
    Action,
    Options,
    Method,
    ResultArray,
    ResultRecord,
    FieldFilterOperator,
    ViewData, RemoveData, CreateData, UpdateData, SetData, SearchData
} from './types.ts';

export default class Database {

    #key?: Key;
    #project?: string;
    #rule: Map<string, Rule> = new Map();

    #token?: string;
    #expires?: number;

    #properties = [
        'integerValue', 'doubleValue',
        'arrayValue', 'bytesValue', 'booleanValue', 'geoPointValue',
        'mapValue', 'nullValue', 'referenceValue', 'stringValue', 'timestampValue'
    ];

    constructor (options?: Options) {
        this.#key = this.#key ?? options?.key;
        this.#project = this.#project ?? options?.project;
    }

    #fieldFilter (operator: FieldFilterOperator, key: string, value: any) {
        const type = this.#type(value);
        return {
            op: operator,
            field: { fieldPath: key },
            value: { [ type ]: value },
        };
    }

    #type (value: any) {
        if (value === null) {
            return 'nullValue';
        } else if (value === undefined) {
            return 'undefined';
        } else if (typeof value === 'string') {
            return 'stringValue';
        } else if (typeof value === 'boolean') {
            return 'booleanValue';
        } else if (typeof value === 'number' && value % 1 !== 0) {
            return 'doubleValue';
        } else if (typeof value === 'number' && value % 1 === 0) {
            return 'integerValue';
        } else if (value instanceof Date) {
            return 'timestampValue';
        } else if (value instanceof Array) {
            return 'arrayValue';
        } else if (typeof value === 'object') {
            return 'mapValue';
        } else {
            throw new Error(`value not allowed ${value}`);
        }
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
        } else if (typeof value === 'object') {
            Object.keys(value).forEach(key => value[ key ] = this.#parse(value[ key ]));
        }

        return value;
    }

    #handle (result: any): any {

        if (result.error) {
            throw new Error(JSON.stringify(result.error, null, '\t'));
        }

        if (result instanceof Array) {
            const skippedResults = result[ 0 ] && 'skippedResults' in result[ 0 ] ?
                result.splice(0, 1)[ 0 ].skippedResults : undefined;

            const formatted = [];
            for (const r of result) {
                const h = this.#handle(r);
                if (h) formatted.push(h);
            }

            return Object.defineProperties(
                formatted,
                { $offset: { value: skippedResults }, $skippedResults: { value: skippedResults } }
            );
        } else if (result.documents) {
            return result.documents.map((r: any) => this.#handle(r));
        } else if (result.document) {
            return this.#parse(result.document.fields);
        } else if (result.fields) {
            return this.#parse(result.fields);
        } else {
            // console.warn(result);
        }

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

        if (method === 'DELETE' && response.status === 200) return;
        if (method === 'GET' && result?.error?.code === 404) return null;

        if (result.error) {
            throw new Error(JSON.stringify(result.error, null, '\t'));
        }

        return this.#handle(result);
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

    view<C extends string, D extends ViewData> (collection: C, data: D): Promise<ResultRecord | null> {

        if (data.$rule !== false) {
            this.#rule.get(`view.${collection}.*`)?.(data);
            this.#rule.get(`view.*.*`)?.(data);
            this.#rule.get(`*.*.*`)?.(data);
        }

        if (data.$rule !== false) {
            this.#rule.get(`view.${collection}.id`)?.(data);
            this.#rule.get(`view.*.id`)?.(data);
            this.#rule.get(`*.*.id`)?.(data);
        }

        if (typeof data.id !== 'string') throw new Error('property id required');
        const id = data.id;

        return this.#fetch('GET', `/${collection}/${id}`);
    }

    remove<C extends string, D extends RemoveData> (collection: C, data: D): Promise<void> {

        if (data.$rule !== false) {
            this.#rule.get(`remove.${collection}.*`)?.(data);
            this.#rule.get(`remove.*.*`)?.(data);
            this.#rule.get(`*.*.*`)?.(data);
        }

        if (data.$rule !== false) {
            this.#rule.get(`remove.${collection}.id`)?.(data);
            this.#rule.get(`remove.*.id`)?.(data);
            this.#rule.get(`*.*.id`)?.(data);
        }

        if (typeof data.id !== 'string') throw new Error('property id required');
        const id = data.id;

        return this.#fetch('DELETE', `/${collection}/${id}`);
    }

    create<C extends string, D extends CreateData> (collection: C, data: D): Promise<ResultRecord> {

        if (data.$rule !== false) {
            this.#rule.get(`create.${collection}.*`)?.(data);
            this.#rule.get(`create.*.*`)?.(data);
            this.#rule.get(`*.*.*`)?.(data);
        }

        const fields: Record<string, Value> = {};

        for (const key in data) {
            if (key.startsWith('$')) continue;
            if (data.$rule !== false) {
                this.#rule.get(`create.${collection}.${key}`)?.(data);
                this.#rule.get(`create.*.${key}`)?.(data);
                this.#rule.get(`*.*.${key}`)?.(data);
            }
            const value = data[ key ];
            if (value === undefined) continue;
            fields[ key ] = ValueFormat(value, key);
        }

        const id = data.id = data.id ?? crypto.randomUUID();

        return this.#fetch('POST', `/${collection}?documentId=${id}`, { fields });
    }

    update<C extends string, D extends UpdateData> (collection: C, data: D): Promise<ResultRecord> {

        if (data.$rule !== false) {
            this.#rule.get(`update.${collection}.*`)?.(data);
            this.#rule.get(`update.*.*`)?.(data);
            this.#rule.get(`*.*.*`)?.(data);
        }

        const fields: Record<string, Value> = {};

        let query = '?currentDocument.exists=true';
        for (const key in data) {
            if (key.startsWith('$')) continue;

            if (data.$rule !== false) {
                this.#rule.get(`update.${collection}.${key}`)?.(data);
                this.#rule.get(`update.*.${key}`)?.(data);
                this.#rule.get(`*.*.${key}`)?.(data);
            }

            if (key === 'id') continue;

            const value = data[ key ];
            if (value !== undefined) fields[ key ] = ValueFormat(value, key);

            query += `&updateMask.fieldPaths=${key}`;
        }

        if (typeof data.id !== 'string') throw new Error('property id required');
        const id = data.id;

        return this.#fetch('PATCH', `/${collection}/${id}${query}`, { fields });
    }

    async set<C extends string, D extends SetData> (collection: C, data: D): Promise<void> {

        if (data.$rule !== false) {
            this.#rule.get(`set.${collection}.*`)?.(data);
            this.#rule.get(`set.*.*`)?.(data);
            this.#rule.get(`*.*.*`)?.(data);
        }

        const fieldPaths: Array<string> = [];
        const fields: Record<string, Value> = {};
        const updateTransforms: Array<Record<string, string | Value>> = [];

        for (const key in data) {
            if (key.startsWith('$')) continue;

            if (data.$rule !== false) {
                this.#rule.get(`set.${collection}.${key}`)?.(data);
                this.#rule.get(`set.*.${key}`)?.(data);
                this.#rule.get(`*.*.${key}`)?.(data);
            }

            // if (key === 'id') continue;

            const value = data[ key ];

            if (data.$increment === key || data.$increment?.includes(key)) {
                updateTransforms.push({ fieldPath: key, increment: ValueFormat(value) });
                continue;
            }

            if (value !== undefined) fields[ key ] = ValueFormat(value, key);

            fieldPaths.push(key);
        }

        const id = data.id = data.id ?? crypto.randomUUID();
        const path = `projects/${this.#project}/databases/(default)/documents/${collection}/${id}`;

        await this.#fetch('POST', ':batchWrite', {
            writes: [ {
                updateTransforms,
                updateMask: { fieldPaths },
                update: { fields, name: path },
            } ]
        });
    }

    search<C extends string, D extends SearchData> (collection: C, data: D): Promise<ResultArray> {

        if (data.$rule !== false) {
            this.#rule.get(`search.${collection}.*`)?.(data);
            this.#rule.get(`search.*.*`)?.(data);
            this.#rule.get(`*.*.*`)?.(data);
        }

        let where = data.$where;
        let orderBy = data.$orderBy;
        let startAt = data.$startAt;

        const limit = data.$limit;
        const endAt = data.$endAt;
        const offset = data.$offset;

        const operator = new Proxy(typeof data.$operator === 'object' ? data.$operator : {}, {
            get: (target, name) => OperatorFormat(target[ name as string ] ?? data.$operator ?? 'EQUAL')
        });

        const direction = new Proxy(typeof data.$direction === 'object' ? data.$direction : {}, {
            get: (target, name) => DirectionFormat(target[ name as string ] ?? data.$direction ?? 'ASCENDING')
        });

        const token = data.$token;
        for (const name in token) {
            const value = token[ name ];
            orderBy = orderBy ?? [];
            startAt = startAt ?? { values: [] };
            orderBy?.push(OrderFormat(name));
            startAt?.values.push(ValueFormat(value));
        }

        if (!where) {
            const filters = [];

            for (const key in data) {
                if (key.startsWith('$')) continue;

                if (data.$rule !== false) {
                    this.#rule.get(`search.${collection}.${key}`)?.(data);
                    this.#rule.get(`search.*.${key}`)?.(data);
                    this.#rule.get(`*.*.${key}`)?.(data);
                }

                const value = data[ key ];
                if (value === undefined) continue;

                if (operator[ key ] === 'STARTS_WITH') {
                    const start = (value as string);
                    const length = start.length;
                    const startPart = start.slice(0, length - 1);
                    const endPart = start.slice(length - 1, length);
                    const end = startPart + String.fromCharCode(endPart.charCodeAt(0) + 1);
                    orderBy = orderBy ?? [];
                    orderBy?.push(OrderFormat(key, direction[ key ]));
                    filters.push({ fieldFilter: this.#fieldFilter('GREATER_THAN_OR_EQUAL', key, start) });
                    filters.push({ fieldFilter: this.#fieldFilter('LESS_THAN', key, end) });
                    continue;
                }

                filters.push({ fieldFilter: this.#fieldFilter(operator[ key ] as FieldFilterOperator, key, value) });
            }

            if (filters.length) {
                where = { compositeFilter: { op: 'AND', filters } };
            }

        }

        let from;
        if ('$from' in data) {
            from = data.$from;
        } else {
            from = [ { collectionId: collection } ];
        }

        const body = {
            structuredQuery: {
                from, where,
                limit, offset,
                orderBy, startAt, endAt
            }
        };

        return this.#fetch('POST', ':runQuery', body);
    }

}
