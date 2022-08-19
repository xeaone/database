import { Key, Data, Value, Options, Method } from './types.ts';
import { parse, serialize } from './util.ts';
import Commit from './commit.ts';
import Search from './search.ts';
import Query from './query.ts';
import jwt from './jwt.ts';

export default class Database {

    #key?: Key;
    #token?: string;
    #expires?: number;
    #project?: string;

    constructor (options?: Options) {
        this.#key = this.#key ?? options?.key;
        this.#project = this.#project ?? options?.project;
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

        if (this.#key) await this.#auth();

        const headers = this.#token ?  { 'Authorization': `Bearer ${this.#token}` } : undefined;
        const response = await fetch(
            `https://firestore.googleapis.com/v1/projects/${this.#project}/databases/(default)/documents${path}`,
            { method, headers, body: body ? JSON.stringify(body) : undefined }
        );

        const result = await response.json();

        const error = result?.error ?? result?.[ 0 ]?.error;
        if (error) throw new Error(JSON.stringify(error, null, '\t'));

        return result;
    }

    key (data: Key): this {
        if (!data || typeof data !== 'object') throw new Error('key type not valid');
        this.#key = data;
        return this;
    }

    project (data: string): this {
        if (!data || typeof data !== 'string') throw new Error('project type not valid');
        this.#project = data;
        return this;
    }

    view (collection: string): Query {
        return new Query(collection, async (body) => {
            const query = await this.#fetch('POST', ':runQuery', body);
            const document = query[ 0 ]?.document;
            const name = document?.name;

            if (!name) throw new Error('View - document not found');

            if (!document.fields) return {};
            return parse(document.fields);
        }, async (identifier) => {
            const document = await this.#fetch('GET', `/${collection}/${identifier}`);

            if (!document.fields) return {};
            return parse(document.fields);
        });
    }

    remove (collection: string): Query {
        return new Query(collection, async (body) => {
            const query = await this.#fetch('POST', ':runQuery', body);
            const document = query[ 0 ]?.document;
            const name = document?.name;

            if (!name) throw new Error('Remove - document not found');

            const identifier = name.split('/').slice(-1)[ 0 ];
            await this.#fetch('DELETE', `/${collection}/${identifier}`);

            // if (!document.fields) return {};
            // return parse(document.fields);
        }, async (identifier) => {
            await this.#fetch('DELETE', `/${collection}/${identifier}`);
        });
    }

    create (collection: string, data: Data): Query {

        let valid = false;
        const fields: Record<string, Value> = {};
        for (const key in data) {
            const value = data[ key ];
            if (value === undefined) continue;
            fields[ key ] = serialize(value);
            valid = true;
        }

        if (!valid) throw new Error('Create - data required');

        return new Query(collection, async (body) => {
            const query = await this.#fetch('POST', ':runQuery', body);
            const document = query[ 0 ]?.document;
            const name = document?.name;

            if (name) throw new Error('Create - document is found');

            const post = await this.#fetch('POST', `/${collection}`, { fields });
            if (!post.fields) return {};
            return parse(post.fields);
        }, async (identifier) => {
            const post = await this.#fetch('POST', `/${collection}?documentId=${identifier}`, { fields });
            if (!post.fields) return {};
            return parse(post.fields);
        });
    }

    update (collection: string, data: Data): Query {

        let valid = false;
        let mask = 'currentDocument.exists=true';
        const fields: Record<string, Value> = {};
        for (const key in data) {
            valid = true;
            mask += `&updateMask.fieldPaths=${key}`;
            const value = data[ key ];
            if (value === undefined) continue;
            fields[ key ] = serialize(value);
        }

        if (!valid) throw new Error('Update - data required');

        return new Query(collection, async (body) => {
            const query = await this.#fetch('POST', ':runQuery', body);
            const document = query[ 0 ]?.document;
            const name = document?.name;

            if (!name) throw new Error('Update - document not found');

            const identifier = name.split('/').slice(-1)[ 0 ];
            const patch = await this.#fetch('PATCH', `/${collection}/${identifier}?${mask}`, { fields });

            if (!patch.fields) return {};
            return parse(patch.fields);
        }, async (identifier) => {
            const patch = await this.#fetch('PATCH', `/${collection}/${identifier}?${mask}`, { fields });

            if (!patch.fields) return {};
            return parse(patch.fields);
        });
    }

    search (collection: string): Search {
        return new Search(collection, async body => {
            const query = await this.#fetch('POST', ':runQuery', body);
            if (!query[ 0 ]?.document?.fields) return [];
            return query.map((entity: any) => parse(entity.document.fields));
        });
    }

    commit (collection: string, data: Data): Commit {
        if (!this.#project) throw new Error('project required');
        return new Commit(this.#project, collection, data, async body => {
            await this.#fetch('POST', ':commit', body);
        });
    }

}
