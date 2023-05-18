import {
    Data, Method, Options, Value,
    ServiceAccountCredentials,
    ApplicationDefaultCredentials,
} from './types.ts';

import { parse, serialize } from './util.ts';
import Commit from './commit.ts';
import Search from './search.ts';
import Query from './query.ts';
import jwt from './jwt.ts';

export default class Database {

    #token?: string;
    #expires?: number;
    #project?: string;
    #serviceAccountCredentials?: ServiceAccountCredentials;
    #applicationDefaultCredentials?: ApplicationDefaultCredentials;

    constructor(options?: Options) {
        this.#project = options?.project;
        this.#serviceAccountCredentials = options?.serviceAccountCredentials;
        this.#applicationDefaultCredentials = options?.applicationDefaultCredentials;
    }

    async #auth() {
        if (this.#expires && this.#expires >= Date.now()) return;

        let response;
        if (this.#applicationDefaultCredentials) {
            response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                body: new URLSearchParams(this.#applicationDefaultCredentials)
            });
        } else if (this.#serviceAccountCredentials) {
            const { client_email, private_key } = this.#serviceAccountCredentials;
            const iss = client_email;
            const iat = Math.round(Date.now() / 1000);
            const exp = iat + (30 * 60);
            const aud = 'https://oauth2.googleapis.com/token';
            const scope = 'https://www.googleapis.com/auth/datastore';
            const assertion = await jwt({ typ: 'JWT', alg: 'RS256' }, { exp, iat, iss, aud, scope }, private_key);
            const grant_type = 'urn:ietf:params:oauth:grant-type:jwt-bearer';
            response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                body: new URLSearchParams({ assertion, grant_type }),
            });
        } else {
            try {
                response = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', {
                    method: 'GET',
                    headers: { 'Metadata-Flavor': 'Google' },
                });
            } catch {
                throw new Error('credentials required');
            }
        }

        const result = await response.json();
        const error = result?.error ?? result?.[0]?.error;
        if (error) throw new Error(JSON.stringify(result.error, null, '\t'));

        this.#token = result.access_token;
        this.#expires = Date.now() + (result.expires_in * 1000);
    }

    async #fetch(method: Method, path: string, body?: any) {
        if (!this.#project) {
            const projectResponse = await fetch('http://metadata.google.internal/computeMetadata/v1/project/project-id', {
                method: 'GET',
                headers: { 'Metadata-Flavor': 'Google' },
            });
            this.#project = await projectResponse.text();
        }

        if (!this.#project) throw new Error('project required');

        await this.#auth();

        const headers = this.#token ? { 'Authorization': `Bearer ${this.#token}` } : undefined;
        const response = await fetch(
            `https://firestore.googleapis.com/v1/projects/${this.#project}/databases/(default)/documents${path}`,
            { method, headers, body: body ? JSON.stringify(body) : undefined },
        );

        const result = await response.json();
        const error = result?.error ?? result?.[0]?.error;
        if (error) throw new Error(JSON.stringify(error, null, '\t'));

        return result;
    }

    applicationDefault(applicationDefaultCredentials: ApplicationDefaultCredentials) {
        this.#applicationDefaultCredentials = { ...applicationDefaultCredentials, grant_type: 'refresh_token' };
        return this;
    }

    serviceAccount(serviceAccountCredentials: ServiceAccountCredentials) {
        this.#serviceAccountCredentials = { ...serviceAccountCredentials };
        return this;
    }

    /**
     * @description
     *              Initialize application default credentials with `gcloud auth application-default login`.
     *              This file should be created and will be used as the application credential:
     *              - Windows: %APPDATA%\gcloud\application_default_credentials.json
     *              - Linux/Mac: $HOME/.config/gcloud/application_default_credentials.json
     * @param credential
     */
    credential(credential: 'meta' | 'application' | ApplicationDefaultCredentials | ServiceAccountCredentials) {
        // const command = await new Deno.Command('gcloud', {
        //     args: ['auth', 'application-default', 'print-access-token'],
        //     stderr: 'inherit',
        // }).output();
        // result = {
        //     expires_in: 3599,
        //     access_token: new TextDecoder().decode(command.stdout),
        // };

        if (credential === 'meta') {
            return;
        } else if (credential === 'application') {
            let file;

            try {
                const prefix = Deno.build.os === 'windows' ? Deno.env.get('APPDATA') : `${Deno.env.get('HOME')}/.config`;
                file = Deno.readTextFileSync(`${prefix}/gcloud/application_default_credentials.json`);
            } catch {
                return;
            }

            const data = JSON.parse(file);
            this.#applicationDefaultCredentials = { ...data, grant_type: 'refresh_token' };
        } else if (credential.type === 'authorized_user') {
            this.applicationDefault(credential as ApplicationDefaultCredentials);
        } else if (credential.type === 'service_account') {
            this.serviceAccount(credential as ServiceAccountCredentials);
        } else {
            throw new Error('credential option required');
        }
    }

    project(data: string): this {
        this.#project = data;
        return this;
    }

    view(collection: string): Query {
        return new Query(collection, async (body) => {
            const query = await this.#fetch('POST', ':runQuery', body);
            const document = query[0]?.document;
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

    remove(collection: string): Query {
        return new Query(collection, async (body) => {
            const query = await this.#fetch('POST', ':runQuery', body);
            const document = query[0]?.document;
            const name = document?.name;

            if (!name) throw new Error('Remove - document not found');

            const identifier = name.split('/').slice(-1)[0];
            await this.#fetch('DELETE', `/${collection}/${identifier}`);

            // if (!document.fields) return {};
            // return parse(document.fields);
        }, async (identifier) => {
            await this.#fetch('DELETE', `/${collection}/${identifier}`);
        });
    }

    create(collection: string, data: Data): Query {
        let valid = false;
        const fields: Record<string, Value> = {};
        for (const key in data) {
            const value = data[key];
            if (value === undefined) continue;
            fields[key] = serialize(value);
            valid = true;
        }

        if (!valid) throw new Error('Create - data required');

        return new Query(collection, async (body) => {
            const query = await this.#fetch('POST', ':runQuery', body);
            const document = query[0]?.document;
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

    update(collection: string, data: Data): Query {
        let valid = false;
        let mask = 'currentDocument.exists=true';
        const fields: Record<string, Value> = {};
        for (const key in data) {
            valid = true;
            mask += `&updateMask.fieldPaths=${key}`;
            const value = data[key];
            if (value === undefined) continue;
            fields[key] = serialize(value);
        }

        if (!valid) throw new Error('Update - data required');

        return new Query(collection, async (body) => {
            const query = await this.#fetch('POST', ':runQuery', body);
            const document = query[0]?.document;
            const name = document?.name;

            if (!name) throw new Error('Update - document not found');

            const identifier = name.split('/').slice(-1)[0];
            const patch = await this.#fetch('PATCH', `/${collection}/${identifier}?${mask}`, { fields });

            if (!patch.fields) return {};
            return parse(patch.fields);
        }, async (identifier) => {
            const patch = await this.#fetch('PATCH', `/${collection}/${identifier}?${mask}`, { fields });

            if (!patch.fields) return {};
            return parse(patch.fields);
        });
    }

    search(collection: string): Search {
        const collections = collection.split('/');
        return new Search(collections.slice(-1)[0], async (body) => {
            // const filters = body.structuredQuery.where.compositeFilter.filters.length;

            const query = await this.#fetch(
                'POST',
                `${collections.length === 1 ? '' : '/' + collections.slice(0, -1).join('/')}:runQuery`,
                body,
            );

            if (!query[0]?.document?.fields) return [];

            return query.map((entity: any) => {
                if (entity.document.fields) {
                    return parse(entity.document.fields);
                } else {
                    return {};
                }
            });
        });
    }

    commit(collection: string, data: Data): Commit {
        if (!this.#project) throw new Error('project required');
        return new Commit(this.#project, collection, data, async (body) => {
            await this.#fetch('POST', ':commit', body);
        });
    }
}
