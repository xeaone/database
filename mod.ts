import { base64url } from './deps.ts';

import {
    OrderFormat,
    ValueFormat,
    OperatorFormat,
    DirectionFormat
} from './format.ts';

import {
    Key,
    Value,
    Header,
    Payload,
    FieldFilterOperator,
    ViewData, RemoveData, CreateData, UpdateData, SetData, SearchData
} from './types.ts';

const encoder = new TextEncoder();

const createJwt = async function (header: Header, payload: Payload, key: CryptoKey): Promise<string> {
    const sHeader = JSON.stringify(header);
    const sPayload = JSON.stringify(payload);
    const signingInput = `${base64url.encode(encoder.encode(sHeader))}.${base64url.encode(encoder.encode(sPayload))}`;
    const signature = base64url.encode(new Uint8Array(
        await crypto.subtle.sign({ hash: { name: 'SHA-256' }, name: 'RSASSA-PKCS1-v1_5' }, key, encoder.encode(signingInput))
    ));
    return `${signingInput}.${signature}`;
};

const stringToArrayBuffer = function (str: string) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[ i ] = str.charCodeAt(i);
    }
    return buf;
};

const createRsa = function (data: string) {
    const contents = data.replace(/^\n?-----BEGIN PRIVATE KEY-----\n?|\n?-----END PRIVATE KEY-----\n?$/g, '');
    const binaryDerString = atob(contents);
    const binaryDer = stringToArrayBuffer(binaryDerString);
    return crypto.subtle.importKey('pkcs8', binaryDer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, true, [ 'sign' ]);
};

export default class Database {

    #key: any;
    #project: string;
    #token?: string;
    #expires?: number;
    #scope: Array<string> = [];
    #constant: Array<string> = [];

    #properties = [
        'integerValue', 'doubleValue',
        'arrayValue', 'bytesValue', 'booleanValue', 'geoPointValue',
        'mapValue', 'nullValue', 'referenceValue', 'stringValue', 'timestampValue'
    ];

    constructor (options: any = {}) {
        this.#key = options.key;
        this.#scope = options.scope;
        this.#project = options.project;
        this.#constant = options.constant;
    }

    key (data: Key) {
        if (data) {
            this.#key = data;
            return this;
        } else {
            return this.#key;
        }
    }

    project (data: string) {
        if (data) {
            this.#project = data;
            return this;
        } else {
            return this.#project;
        }
    }

    scope (data: Array<string>) {
        if (data) {
            this.#scope = data;
            return this;
        } else {
            return this.#scope;
        }
    }

    constant (data: Array<string>) {
        if (data) {
            this.#constant = data;
            return this;
        } else {
            return this.#constant;
        }
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
            throw new Error(`${result.error.status} - ${result.error.message}`);
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

        if (this.#expires && this.#expires >= Date.now()) return;

        const key = await createRsa(this.#key.private_key);
        const iss = this.#key.client_email;
        const iat = Math.round(Date.now() / 1000);
        const exp = iat + (30 * 60);
        const aud = 'https://oauth2.googleapis.com/token';
        const scope = 'https://www.googleapis.com/auth/datastore';
        const assertion = await createJwt({ typ: 'JWT', alg: 'RS256', }, { exp, iat, iss, aud, scope }, key);

        const result = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            body: [
                `assertion=${encodeURIComponent(assertion)}`,
                `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}`
            ].join('&'),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).then(response => response.json());

        if (result.error) {
            throw new Error(`${result.error.status} - ${result.error.message}`);
        }

        this.#token = result.access_token;
        this.#expires = Date.now() + (result.expires_in * 1000);
    }

    async #fetch (method: string, path: string, body?: any) {
        await this.#auth();

        method = method.toUpperCase();
        body = body ? JSON.stringify(body) : undefined;

        const result = await fetch(
            `https://firestore.googleapis.com/v1/projects/${this.#project}/databases/(default)/documents${path}`,
            { headers: { 'Authorization': `Bearer ${this.#token}` }, method, body }
        ).then(response => response.json());

        if (method === 'GET' && result?.error?.code === 404) return null;

        if (result.error) {
            throw new Error(`${result.error.status} - ${result.error.message}`);
        }

        return this.#handle(result);
    }

    #id (data: Record<string, any>) {
        if (typeof data.id !== 'string') throw new Error('property id required');
        if (data.$scope === false) return data.id;

        const result = [];
        for (const name of this.#scope) {
            const value = data[ name ];
            if (!value || typeof value !== 'string') throw new Error(`scope property ${name} required`);
            result.push(value);
        }

        result.push(data.id);
        return result.join('-');
    }

    remove<C extends string, D extends RemoveData> (collection: C, data: D): Promise<Record<string, any>> {
        const id = this.#id(data);
        return this.#fetch('delete', `/${collection}/${id}`);
    }

    view<C extends string, D extends ViewData> (collection: C, data: D): Promise<any> {
        const id = this.#id(data);
        return this.#fetch('get', `/${collection}/${id}`);
    }

    create<C extends string, D extends CreateData> (collection: C, data: D): Promise<Record<string, any>> {
        data.id = data.id ?? crypto.randomUUID();

        if (this.#constant.some(c => !(c in data))) throw new Error('constant required');

        const id = this.#id(data);
        const fields: Record<string, Value> = {};

        for (const key in data) {
            const value = data[ key ];
            if (value === undefined) continue;
            fields[ key ] = ValueFormat(value, key);
        }

        return this.#fetch('post', `/${collection}?documentId=${id}`, { fields });
    }

    update<C extends string, D extends UpdateData> (collection: C, data: D): Promise<Record<string, any>> {
        const id = this.#id(data);
        const fields: Record<string, Value> = {};

        let query = '?currentDocument.exists=true';
        for (const key in data) {
            const value = data[ key ];

            if (key === 'id' ||
                key.startsWith('$') ||
                this.#scope.includes(key) ||
                this.#constant.includes(key)) continue;

            if (value !== undefined) fields[ key ] = ValueFormat(value, key);

            query += `&updateMask.fieldPaths=${key}`;
        }

        return this.#fetch('patch', `/${collection}/${id}${query}`, { fields });
    }

    async set<C extends string, D extends SetData> (collection: C, data: D): Promise<void> {
        data.id = data.id ?? crypto.randomUUID();

        const id = this.#id(data);
        const fieldPaths: Array<string> = [];
        const fields: Record<string, Value> = {};
        const updateTransforms: Array<Record<string, string | Value>> = [];

        for (const key in data) {
            const value = data[ key ];

            if (key.startsWith('$')) continue;

            if (data.$increment === key || data.$increment?.includes(key)) {
                updateTransforms.push({ fieldPath: key, increment: ValueFormat(value) });
                continue;
            }

            if (value !== undefined) fields[ key ] = ValueFormat(value, key);

            fieldPaths.push(key);
        }

        const path = `projects/${this.#project}/databases/(default)/documents/${collection}/${id}`;

        await this.#fetch('post', `:batchWrite`, {
            writes: [ {
                updateTransforms,
                updateMask: { fieldPaths },
                update: { fields, name: path },
            } ]
        });
    }

    search<C extends string, D extends SearchData> (collection: C, data: D): Promise<Array<Record<string, any>>> {

        if (data.$scope !== false) {
            for (const name of this.#scope) {
                const value = data[ name ];
                if (!value || typeof value !== 'string') throw new Error(`scope property ${name} required`);
            }
        }

        let where = data.$where;
        let orderBy = data.$orderBy;
        let startAt = data.$startAt;

        const limit = data.$limit;
        const endAt = data.$endAt;
        const offset = data.$offset;

        const operator = new Proxy(typeof data.$operator === 'object' ? data.$operator : {}, {
            get: (target, name) => OperatorFormat(target[ name as string ] ?? data.$operator)
        });

        const direction = new Proxy(typeof data.$direction === 'object' ? data.$direction : {}, {
            get: (target, name) => DirectionFormat(target[ name as string ] ?? data.$direction)
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
                const value = data[ key ];

                if (value === undefined || key.startsWith('$')) continue;

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

        return this.#fetch('post', `:runQuery`, body);
    }

}