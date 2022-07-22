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
    From,
    Value,
    Action,
    Options,
    Method,
    EndAt,
    ResultArray,
    ResultRecord,
    FieldFilterOperator,
    ViewData, RemoveData, CreateData, UpdateData, SetData, SearchData, Operator, Direction, OrderBy, StartAt, Where, FieldFilter, Filters, FieldReference, Filter, ArrayValue
} from './types.ts';

const ID = Symbol('id');

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

    #value (value: any): Value {
        if (value === null) {
            return { nullValue: value };
            // } else if (value === undefined) {
            // return { 'undefined': value };
        } else if (typeof value === 'string') {
            return { stringValue: value };
        } else if (typeof value === 'boolean') {
            return { booleanValue: value };
        } else if (typeof value === 'number' && value % 1 !== 0) {
            return { doubleValue: value };
        } else if (typeof value === 'number' && value % 1 === 0) {
            return { integerValue: `${value}` };
        } else if (value instanceof Date) {
            return { timestampValue: `${value}` };
        } else if (value instanceof Array) {
            return { arrayValue: value as any };
        } else if (typeof value === 'object') {
            return { mapValue: value };
        } else {
            throw new Error(`value not allowed ${value}`);
        }
    }

    #order (key: string, direction?: Direction) {
        return { field: { fieldPath: key }, direction: direction ?? 'ASCENDING' };
    }

    #filter (operator: string, key: string, value: any): FieldFilter {
        // const type = this.#type(value);
        return {
            fieldFilter: {
                field: { fieldPath: key },
                value: this.#value(value),
                op: this.#operator(operator),
                // value: { [ type ]: value } as Value
            }
        };
    }

    #operator (operator: string): Operator {
        // if (/^(s|starts_?with)$/i.test(operator)) return 'STARTS_WITH';
        // else
        if (/^(i|in)$/i.test(operator)) return 'IN';
        else if (/^(ni|not_?in)$/i.test(operator)) return 'NOT_IN';

        else if (/^(e|equal)$/i.test(operator)) return 'EQUAL';
        else if (/^(ne|not_?equal)$/i.test(operator)) return 'NOT_EQUAL';

        else if (/^(l|less_?than)$/i.test(operator)) return 'LESS_THAN';
        else if (/^(le|less_?than_?or_?equal)$/i.test(operator)) return 'LESS_THAN_OR_EQUAL';

        else if (/^(ac|array_?contains)$/i.test(operator)) return 'ARRAY_CONTAINS';
        else if (/^(aca|array_?contains_?any)$/i.test(operator)) return 'ARRAY_CONTAINS_ANY';

        else if (/^(g|greater_?than)$/i.test(operator)) return 'GREATER_THAN';
        else if (/^(ge|greater_?than_?or_?equal)$/i.test(operator)) return 'GREATER_THAN_OR_EQUAL';

        else throw new Error(`operator ${operator} not valid`);
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
        } else if (value === undefined) {
            return;
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
                { $offset: { value: skippedResults }, $skippedResults: { value: skippedResults }, $id: { value: 'test' } }
            );
        } else if (result.documents) {
            return result.documents.map(this.#handle);
        } else if (result.fields || result.document) {
            return this.#parse(result.fields || result.document.fields);
            // const fields = result.fields || result.document.fields;
            // const name = result.name || result.document.name;
            // const entity = this.#parse(fields);
            // entity[ ID ] = name.split('/').slice(-1)[ 0 ];
            // return entity;
            // return Object.defineProperties(
            //     this.#parse(fields),
            //     { $id: { value: name.split('/').slice(-1)[ 0 ] } }
            // );
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

        // if (method === 'DELETE' && response.status === 200) return;
        // if (method === 'GET' && result?.error?.code === 404) return null;

        if (result.error) {
            throw new Error(JSON.stringify(result.error, null, '\t'));
        }

        // return this.#handle(result);
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
    async create<C extends string, D extends CreateData> (collection: C, data: D): Promise<ResultRecord> {

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

        // const id = data.id = data.id ?? crypto.randomUUID();
        // return this.#fetch('POST', `/${collection}?documentId=${id}`, { fields });

        const result = await this.#fetch('POST', `/${collection}`, { fields });
        return this.#handle(result);
    }

    // review and test
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

        // might need to check results for errors
        await this.#fetch('POST', ':batchWrite', {
            writes: [ {
                updateTransforms,
                updateMask: { fieldPaths },
                update: { fields, name: path },
            } ]
        });

    }

    async view<C extends string, D extends ViewData> (collection: C, data: D): Promise<ResultRecord | null> {

        if (data.$rule !== false) {
            this.#rule.get(`view.${collection}.*`)?.(data);
            this.#rule.get(`view.*.*`)?.(data);
            this.#rule.get(`*.*.*`)?.(data);
        }

        // if (data.$id) {
        //     const result = await this.#fetch('GET', `/${collection}/${data.$id}`);
        // }

        const filters = [];
        for (const key in data) {
            if (key.startsWith('$')) continue;

            if (data.$rule !== false) {
                this.#rule.get(`view.${collection}.${key}`)?.(data);
                this.#rule.get(`view.*.${key}`)?.(data);
                this.#rule.get(`*.*.${key}`)?.(data);
            }

            const value = data[ key ];
            if (value === undefined) throw new Error(`View - property ${key} undefined`);

            const operator = data?.$where?.[ key ];
            if (!operator) continue;
            if (typeof operator !== 'string') throw new Error(`View - operator ${key} invalid`);
            filters.push(this.#filter(operator, key, value));

        }

        const wheres = Object.keys(data?.$where ?? {});
        if (!wheres.length) throw new Error('View - operators required');
        if (filters.length !== wheres.length) throw new Error(`View - properties required ${wheres.join(', ')}`);

        const limit = 1;
        const from: From = [ { collectionId: collection } ];
        const where: Where = { compositeFilter: { op: 'AND', filters } };
        const body = { structuredQuery: { from, where, limit } };

        const query = await this.#fetch('POST', ':runQuery', body);
        const name = query[ 0 ]?.document?.name;
        if (!name) return null;

        const fields = query[ 0 ]?.document?.fields;

        return fields ? this.#parse(fields) : null;
    }

    async remove<C extends string, D extends RemoveData> (collection: C, data: D): Promise<ResultRecord | null> {

        if (data.$rule !== false) {
            this.#rule.get(`remove.${collection}.*`)?.(data);
            this.#rule.get(`remove.*.*`)?.(data);
            this.#rule.get(`*.*.*`)?.(data);
        }

        // if (data.$id) {
        //     return this.#fetch('DELETE', `/${collection}/${data.$id}`);
        // }

        const filters = [];
        for (const key in data) {
            if (key.startsWith('$')) continue;

            if (data.$rule !== false) {
                this.#rule.get(`remove.${collection}.${key}`)?.(data);
                this.#rule.get(`remove.*.${key}`)?.(data);
                this.#rule.get(`*.*.${key}`)?.(data);
            }

            const value = data[ key ];
            if (value === undefined) throw new Error(`Remove - property ${key} undefined`);

            const operator = data?.$where?.[ key ];
            if (!operator) continue;
            if (typeof operator !== 'string') throw new Error(`Remove - operator ${key} invalid`);
            filters.push(this.#filter(operator, key, value));

        }

        const wheres = Object.keys(data?.$where ?? {});
        if (!wheres.length) throw new Error('Remove - operator/s required');
        if (filters.length !== wheres.length) throw new Error(`Remove - properties required ${wheres.join(', ')}`);

        const limit = 1;
        const from: From = [ { collectionId: collection } ];
        const where: Where = { compositeFilter: { op: 'AND', filters } };
        const body = { structuredQuery: { from, where, limit } };

        const query = await this.#fetch('POST', ':runQuery', body);
        const name = query[ 0 ]?.document?.name;
        if (!name) return null;

        const id = name.split('/').slice(-1)[ 0 ];
        await this.#fetch('DELETE', `/${collection}/${id}`);

        return this.#parse(query[ 0 ]?.document?.fields);
    }

    async update<C extends string, D extends UpdateData> (collection: C, data: D): Promise<ResultRecord | null> {

        if (data.$rule !== false) {
            this.#rule.get(`update.${collection}.*`)?.(data);
            this.#rule.get(`update.*.*`)?.(data);
            this.#rule.get(`*.*.*`)?.(data);
        }

        // if (data.$id) {
        // }

        const filters = [];
        const fields: Record<string, Value> = {};
        let mask = '?currentDocument.exists=true';

        for (const key in data) {
            if (key.startsWith('$')) continue;

            if (data.$rule !== false) {
                this.#rule.get(`update.${collection}.${key}`)?.(data);
                this.#rule.get(`update.*.${key}`)?.(data);
                this.#rule.get(`*.*.${key}`)?.(data);
            }

            mask += `&updateMask.fieldPaths=${key}`;

            const value = data[ key ];
            if (value === undefined) continue;

            fields[ key ] = ValueFormat(value, key);

            const operator = data?.$where?.[ key ];
            if (!operator) continue;
            if (typeof operator !== 'string') throw new Error(`Update - operator ${key} invalid`);
            filters.push(this.#filter(operator, key, value));

        }

        const wheres = Object.keys(data?.$where ?? {});
        if (!wheres.length) throw new Error('Update - operators required');
        if (filters.length !== wheres.length) throw new Error(`Update - properties required ${wheres.join(', ')}`);

        const limit = 1;
        const from: From = [ { collectionId: collection } ];
        const where: Where = { compositeFilter: { op: 'AND', filters } };
        const body = { structuredQuery: { from, where, limit } };

        const query = await this.#fetch('POST', ':runQuery', body);
        const name = query[ 0 ]?.document?.name;
        if (!name) return null;

        const id = name.split('/').slice(-1)[ 0 ];
        const patch = await this.#fetch('PATCH', `/${collection}/${id}${mask}`, { fields });

        if (!patch.fields) return null;

        return this.#parse(patch?.fields);
    }

    async search<C extends string, D extends SearchData> (collection: C, data: D): Promise<ResultArray> {

        if (data.$rule !== false) {
            this.#rule.get(`search.${collection}.*`)?.(data);
            this.#rule.get(`search.*.*`)?.(data);
            this.#rule.get(`*.*.*`)?.(data);
        }

        let orderBy: OrderBy | undefined;
        let startAt: StartAt | undefined;
        let endAt: EndAt | undefined;

        const token = data.$token;
        for (const name in token) {
            const value = token[ name ];
            orderBy = orderBy ?? [];
            startAt = startAt ?? { values: [] };
            orderBy.push(this.#order(name, data?.$order?.[ name ]));
            startAt.values.push(ValueFormat(value));
        }

        const filters: Filters = [];
        for (const key in data) {
            if (key.startsWith('$')) continue;

            if (data.$rule !== false) {
                this.#rule.get(`search.${collection}.${key}`)?.(data);
                this.#rule.get(`search.*.${key}`)?.(data);
                this.#rule.get(`*.*.${key}`)?.(data);
            }

            const value = data[ key ];
            if (value === undefined) throw new Error(`Search - property ${key} undefined`);

            const operator = data?.$where?.[ key ];
            if (!operator) continue;
            if (typeof operator !== 'string') throw new Error(`Search - operator ${key} invalid`);

            if (/^(s(a|d)?|starts_?with_?(ascending|descending)?)$/i.test(operator)) {
                const start = (value as string);
                const length = start.length;
                const startPart = start.slice(0, length - 1);
                const endPart = start.slice(length - 1, length);
                const end = startPart + String.fromCharCode(endPart.charCodeAt(0) + 1);
                const direction = data?.$order?.[ key ];
                orderBy = orderBy ?? [];
                orderBy.push(this.#order(key, direction));
                filters.push(this.#filter('GREATER_THAN_OR_EQUAL', key, start));
                filters.push(this.#filter('LESS_THAN', key, end));
                continue;
            }

            filters.push(this.#filter(operator, key, value));
        }

        const wheres = Object.keys(data?.$where ?? {});
        if (!wheres.length) throw new Error('Search - operators required');
        if (filters.length !== wheres.length) throw new Error(`Search - properties required ${wheres.join(', ')}`);

        const limit: number = data.$limit;
        const offset: number = data.$offset;
        const from: From = [ { collectionId: collection } ];
        const where: Where = { compositeFilter: { op: 'AND', filters } };
        const body = { structuredQuery: { from, where, limit, offset, orderBy, startAt, endAt } };

        const query = await this.#fetch('POST', ':runQuery', body);
        return this.#handle(query);
    }

}
