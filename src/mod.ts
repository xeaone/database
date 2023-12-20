import { ApplicationDefaultCredentials, Data, Method, Options, ServiceAccountCredentials, Value } from './types.ts';

import { parse, REFERENCE, serialize } from './util.ts';
import Commit from './commit.ts';
import Search from './search.ts';
import Query from './query.ts';
import jwt from './jwt.ts';

export default class Database {

    #token?: string;
    #expires?: number;
    #project: string;

    #attempts = 10;
    #timeout = 1000;
    #id = '(default)';
    #base = new URL('https://firestore.googleapis.com/v1');

    #serviceAccountCredentials?: ServiceAccountCredentials;
    #applicationDefaultCredentials?: ApplicationDefaultCredentials;

    constructor (options?: Options) {
        this.#project = options?.project ?? '';
        this.#base = options?.base ?? this.#base;
        this.#timeout = options?.timeout ?? this.#timeout;
        this.#attempts = options?.attempts ?? this.#attempts;
        this.#serviceAccountCredentials = options?.serviceAccountCredentials;
        this.#applicationDefaultCredentials = options?.applicationDefaultCredentials;
    }

    async #auth(attempts:number) {
        if (this.#expires && this.#expires >= Date.now()) return;

        let response;
        if (this.#applicationDefaultCredentials) {
            response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                signal: AbortSignal.timeout(this.#timeout * attempts),
                body: new URLSearchParams(this.#applicationDefaultCredentials),
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
                signal: AbortSignal.timeout(this.#timeout * attempts),
                body: new URLSearchParams({ assertion, grant_type }),
            });
        } else {
            try {
                response = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', {
                    method: 'GET',
                    signal: AbortSignal.timeout(this.#timeout * attempts),
                    headers: { 'Metadata-Flavor': 'Google', 'X-Google-Metadata-Request': 'True' },
                });
            } catch (error) {
                if (error?.name !== 'TimeoutError') {
                    throw new Error('credentials required');
                } else {
                    throw new Error(error?.message, { cause: error });
                }
            }
        }

        if (response.status !== 200) {
            throw new Error(`${response.status} ${response.statusText} \n${await response.text()}\n`);
        }

        const result = await response.json();

        this.#token = result.access_token;
        this.#expires = Date.now() + (result.expires_in * 1000);
    }

    async #fetch (method: Method, path: string, body?: any, attempts?: number): Promise<any> {
        attempts = attempts || 1;
        try {

            if (!this.#project) {
                const projectResponse = await fetch('http://metadata.google.internal/computeMetadata/v1/project/project-id', {
                    method: 'GET',
                    signal: AbortSignal.timeout(this.#timeout * attempts),
                    headers: { 'Metadata-Flavor': 'Google', 'X-Google-Metadata-Request': 'True' },
                });
                this.#project = await projectResponse.text();
            }

            if (!this.#project) throw new Error('project required');

            await this.#auth(attempts);

            const signal =
                method === 'PATCH' ||
                method === 'DELETE' ||
                (method === 'POST' && path !== ':runQuery') ?
                    AbortSignal.timeout(this.#timeout * attempts) : undefined;

            const url = new URL(`${this.#base}/projects/${this.#project}/databases/${this.#id}/documents${path}`);

            const response = await fetch(url, {
                method,
                body: body ? JSON.stringify(body) : undefined,
                signal,
                headers: {
                    'accept': 'application/json',
                    'content-type': 'application/json',
                    'authorization': this.#token ? `Bearer ${this.#token}` : '',
                    'x-goog-request-params': `project_id=${this.#project}&database_id=${this.#id}`,
                }
            });

            if (response.status !== 200) {
                throw new Error(`${response.status} ${response.statusText} \n${await response.text()}\n`);
            }

            return response.json();

        } catch (error) {
            if (error?.name === 'TimeoutError' && attempts < this.#attempts) {
                return this.#fetch(method, path, body, attempts + 1);
            } else {
                throw new Error(error?.message, { cause: error });
            }
        }
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
     *      Initialize application default credentials with `gcloud auth application-default login`.
     *          - Windows: %APPDATA%\gcloud\application_default_credentials.json
     *          - Linux/Mac: $HOME/.config/gcloud/application_default_credentials.json
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

    /**
     * @description Sets the max request time. Defaults to 500ms.
     * @param {Number} timeout The milliseconds for request a timeout.
     * @return {Database}
     */
    timeout (timeout: number): this {
        this.#timeout = timeout;
        return this;
    }

    /**
     * @description Sets the max retry atttempts after request timeout. Defaults to 5.
     * @param {Number} attempts The amount of attempts for timeout retries.
     * @returns {Database}
     */
    attempts (attempts: number): this {
        this.#attempts = attempts;
        return this;
    }

    /**
     * @description The base url to use to connect to the database deafult is https://firestore.googleapis.com/v1/
     * @param {string}
     * @return {Database}
     */
    base (base: string) {
        this.#base = new URL(base.replace(/\/+$/, ''));
        return this;
    }

    /**
     * @description The database to use the default is `(default)`
     * @param {string} id
     * @returns {Database}
     */
    id(id: string): this {
        this.#id = id;
        return this;
    }

    /**
     * @description The GCP project
     * @param {string} project
     * @returns {Database}
     */
    project(project: string): this {
        this.#project = project;
        return this;
    }

    view(collection: string): Query {
        return new Query(this.#project, collection, async (body) => {
            const query = await this.#fetch('POST', ':runQuery', body);
            const document = query[0]?.document;
            const name = document?.name;

            if (!name) throw new Error('View - document not found');

            if (!document.fields) return {};
            const result = parse(document.fields);
            result[REFERENCE] = document.name;
            return result;
        }, async (identifier) => {
            const document = await this.#fetch('GET', `/${collection}/${identifier}`);

            if (!document.fields) return {};
            const result = parse(document.fields);
            result[REFERENCE] = document.name;
            return result;
        });
    }

    remove(collection: string): Query {
        return new Query(this.#project, collection, async (body) => {
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

        return new Query(this.#project, collection, async (body) => {
            const query = await this.#fetch('POST', ':runQuery', body);
            const document = query[0]?.document;
            const name = document?.name;

            if (name) throw new Error('Create - document is found');

            const post = await this.#fetch('POST', `/${collection}`, { fields });

            if (!post.fields) return {};
            const result = parse(post.fields);
            result[REFERENCE] = post.name;
            return result;
        }, async (identifier) => {
            const post = await this.#fetch('POST', `/${collection}?documentId=${identifier}`, { fields });

            if (!post.fields) return {};
            const result = parse(post.fields);
            result[REFERENCE] = post.name;
            return result;
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

        return new Query(this.#project, collection, async (body) => {
            const query = await this.#fetch('POST', ':runQuery', body);
            const document = query[0]?.document;
            const name = document?.name;

            if (!name) throw new Error('Update - document not found');

            const identifier = name.split('/').slice(-1)[0];
            const patch = await this.#fetch('PATCH', `/${collection}/${identifier}?${mask}`, { fields });

            if (!patch.fields) return {};
            const result = parse(patch.fields);
            result[REFERENCE] = patch.name;
            return result;
        }, async (identifier) => {
            const patch = await this.#fetch('PATCH', `/${collection}/${identifier}?${mask}`, { fields });

            if (!patch.fields) return {};
            const result = parse(patch.fields);
            result[REFERENCE] = patch.name;
            return result;
        });
    }

    search(collection: string): Search {
        const collections = collection.split('/');
        return new Search(this.#id, this.#project, collections.slice(-1)[0], async (body) => {
            // const filters = body.structuredQuery.where.compositeFilter.filters.length;

            const query = await this.#fetch(
                'POST',
                `${collections.length === 1 ? '' : '/' + collections.slice(0, -1).join('/')}:runQuery`,
                body,
            );

            if (!query[0]?.document?.fields) return [];

            return query.map((entity: any) => {
                if (entity.document.fields) {
                    const result = parse(entity.document.fields);
                    result[REFERENCE] = entity.document.name;
                    return result;
                } else {
                    return {};
                }
            });
        });
    }

    commit(collection: string, data: Data): Commit {
        if (!this.#project) throw new Error('project required');
        return new Commit(this.#id, this.#project, collection, data, async (body) => {
            await this.#fetch('POST', ':commit', body);
        });
    }
}
