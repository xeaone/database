import { base64url } from './deps.ts';
import {
    Key,
    Payload,
    Header,
    FieldFilterOperator,
    // CompositeFilterOperator,
    // FieldReference,
    // OrderBy,
    // Value,
    ViewData, RemoveData, CreateData, UpdateData, SearchData
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

    #token?: string;
    #expires?: number;

    #key: any;
    #project: string;

    #require: Array<string> = [];
    #constant: Array<string> = [];

    constructor (options: any = {}) {
        this.#key = options.key;
        this.#project = options.project;
    }

    require (data: Array<string>) {
        if (data) {
            this.#require = data;
            return this;
        } else {
            return this.#require;
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

    project (data: string) {
        if (data) {
            this.#project = data;
            return this;
        } else {
            return this.#project;
        }
    }

    key (data: Key) {
        if (data) {
            this.#key = data;
            return this;
        } else {
            return this.#key;
        }
    }

    #properties = [
        'integerValue', 'doubleValue',
        'arrayValue', 'bytesValue', 'booleanValue', 'geoPointValue',
        'mapValue', 'nullValue', 'referenceValue', 'stringValue', 'timestampValue'
    ];

    #fieldFilter (operator: FieldFilterOperator, key: string, value: any) {
        const type = this.#type(value);
        return { op: operator, value: { [ type ]: value }, field: { fieldPath: key } };
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

    #format (data: any, updateMask?: string[]) {
        data = { ...data };

        for (const key in data) {
            const value = data[ key ];
            if (key !== 'id' && !this.#constant.includes(key)) updateMask?.push(key);

            if (value === null) {
                data[ key ] = { nullValue: value };
            } else if (value === undefined) {
                delete data[ key ];
            } else if (typeof value === 'string') {
                data[ key ] = { stringValue: value };
            } else if (typeof value === 'boolean') {
                data[ key ] = { booleanValue: value };
            } else if (typeof value === 'number' && value % 1 !== 0) {
                data[ key ] = { doubleValue: value };
            } else if (typeof value === 'number' && value % 1 === 0) {
                data[ key ] = { integerValue: value };
            } else if (value instanceof Date) {
                data[ key ] = { timestampValue: value };
            } else if (value instanceof Array) {
                data[ key ] = { arrayValue: this.#format(value) };
            } else if (typeof value === 'object') {
                data[ key ] = { mapValue: this.#format(value) };
            } else {
                throw new Error(`value not allowed ${value}`);
            }
        }

        return data;
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
            // value = (value[ property ] && value[ property ].values || []).map((v: any) => this.#parse(v));
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

    async #fetch (method: string, path: string, body?: any) {
        method = method.toUpperCase();
        body = body ? JSON.stringify(body) : undefined;

        const result = await fetch(
            `https://firestore.googleapis.com/v1/projects/${this.#project}/databases/(default)/documents${path}`,
            { method, headers: { 'Authorization': `Bearer ${this.#token}` }, body }
        ).then(response => response.json());

        if (result.error) {
            throw new Error(`${method} ${result.error.status} - ${result.error.message}`);
        }

        return this.#handle(result);
    }

    async #before (data: any) {

        const required = data.$require === false ? false : this.#require.find(require => require in data === false);
        if (required) throw new Error(`required property ${required} not found`);

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
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }).then(response => response.json());

        if (result.error) {
            throw new Error(`${result.error.status} - ${result.error.message}`);
        }

        this.#token = result.access_token;
        this.#expires = Date.now() + (result.expires_in * 1000);
    }

    async remove (collection: string, data: RemoveData): Promise<Record<string, any>> {
        // async remove<C extends string, D extends RemoveData> (collection: C, data: D) {
        await this.#before(data);
        return this.#fetch('delete', `/${collection}/${data.id}`);
    }

    async view (collection: string, data: ViewData): Promise<Record<string, any>> {
        // async view<C extends string, D extends ViewData> (collection: C, data: D) {
        await this.#before(data);
        return this.#fetch('get', `/${collection}/${data.id}`);
    }

    async create (collection: string, data: CreateData): Promise<Record<string, any>> {
        // async create<C extends string, D extends CreateData> (collection: C, data: D) {
        await this.#before(data);

        const id = data.id ?? crypto.randomUUID();
        data.id = id;

        const fields = this.#format(data);
        const body = { fields };

        return this.#fetch('post', `/${collection}?documentId=${id}`, body);
    }

    async update (collection: string, data: UpdateData): Promise<Record<string, any>> {
        // async update<C extends string, D extends UpdateData> (collection: C, data: D) {
        await this.#before(data);

        const id = data.id;
        const updateMask: string[] = [];
        const fields = this.#format(data, updateMask);
        const body = { fields };

        const query = [
            '?',
            'currentDocument.exists=true&',
            `updateMask.fieldPaths=${updateMask.join('&updateMask.fieldPaths=')}`
        ].join('');

        return this.#fetch('patch', `/${collection}/${id}${query}`, body);
    }

    async search (collection: string, data: SearchData): Promise<Array<any>> {
        // async search<C extends string, D extends SearchData> (collection: C, data: D) {
        await this.#before(data);

        let where;
        if ('$where' in data) {
            where = data.$where;
        } else {
            const filters = [];

            for (const key in data) {
                if (key.startsWith('$')) continue;
                const value = data[ key ];
                if (value === undefined) continue;
                const fieldFilter = this.#fieldFilter('EQUAL', key, value);
                filters.push({ fieldFilter });
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
                limit: data.$limit, offset: data.$offset,
                orderBy: data.$orderBy, startAt: data.$startAt, endAt: data.$endAt
            }
        };

        return this.#fetch('post', `:runQuery`, body);
    }

}
