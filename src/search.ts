import { Data, End, EndAt, FieldFilter, From, OrderBy, Result, StartAt, UnaryFilter, Where } from './types.ts';

import { REFERENCE, serialize } from './util.ts';

export default class Search {
    #end: End;
    #limit?: number;
    #offset?: number;

    #id: string;
    #project: string;
    #collection: string;

    #orderBy: OrderBy = [];
    #endAt: EndAt = { values: [], before: false };
    #startAt: StartAt = { values: [], before: false };
    #filters: Array<FieldFilter | UnaryFilter> = [];

    constructor(id:string, project: string, collection: string, end: End) {
        this.#end = end;
        this.#id = id;
        this.#project = project;
        this.#collection = collection;
    }

    startsWith(data: Data): this {
        for (const key in data) {
            const start = data[key];
            const length = start.length;
            const startPart = start.slice(0, length - 1);
            const endPart = start.slice(length - 1, length);
            const end = startPart + String.fromCharCode(endPart.charCodeAt(0) + 1);
            this.#filters.push({ fieldFilter: { field: { fieldPath: key }, op: 'GREATER_THAN_OR_EQUAL', value: serialize(start) } });
            this.#filters.push({ fieldFilter: { field: { fieldPath: key }, op: 'LESS_THAN', value: serialize(end) } });
        }
        return this;
    }

    in(data: Data): this {
        const op = 'IN';
        for (const key in data) this.#filters.push({ fieldFilter: { field: { fieldPath: key }, op, value: serialize(data[key]) } });
        return this;
    }

    notIn(data: Data): this {
        const op = 'NOT_IN';
        for (const key in data) this.#filters.push({ fieldFilter: { field: { fieldPath: key }, op, value: serialize(data[key]) } });
        return this;
    }

    equal(data: Data): this {
        const op = 'EQUAL';
        for (const key in data) this.#filters.push({ fieldFilter: { field: { fieldPath: key }, op, value: serialize(data[key]) } });
        return this;
    }

    notEqual(data: Data): this {
        const op = 'NOT_EQUAL';
        for (const key in data) this.#filters.push({ fieldFilter: { field: { fieldPath: key }, op, value: serialize(data[key]) } });
        return this;
    }

    lessThan(data: Data): this {
        const op = 'LESS_THAN';
        for (const key in data) this.#filters.push({ fieldFilter: { field: { fieldPath: key }, op, value: serialize(data[key]) } });
        return this;
    }

    lessThanOrEqual(data: Data): this {
        const op = 'LESS_THAN_OR_EQUAL';
        for (const key in data) this.#filters.push({ fieldFilter: { field: { fieldPath: key }, op, value: serialize(data[key]) } });
        return this;
    }

    arrayContains(data: Data): this {
        const op = 'ARRAY_CONTAINS';
        for (const key in data) this.#filters.push({ fieldFilter: { field: { fieldPath: key }, op, value: serialize(data[key]) } });
        return this;
    }

    arrayContainsAny(data: Data): this {
        const op = 'ARRAY_CONTAINS_ANY';
        for (const key in data) this.#filters.push({ fieldFilter: { field: { fieldPath: key }, op, value: serialize(data[key]) } });
        return this;
    }

    greaterThan(data: Data): this {
        const op = 'GREATER_THAN';
        for (const key in data) this.#filters.push({ fieldFilter: { field: { fieldPath: key }, op, value: serialize(data[key]) } });
        return this;
    }

    greaterThanOrEqual(data: Data): this {
        const op = 'GREATER_THAN_OR_EQUAL';
        for (const key in data) this.#filters.push({ fieldFilter: { field: { fieldPath: key }, op, value: serialize(data[key]) } });
        return this;
    }

    // The maximum number of results to return.
    // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.limit
    limit(limit: number): this {
        this.#limit = limit;
        return this;
    }

    // The number of results to skip.
    // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.offset
    offset(offset: number): this {
        this.#offset = offset;
        return this;
    }

    isNan(...keys: Array<string>): this {
        const op = 'IS_NAN';
        for (const key of keys) this.#filters.push({ unaryFilter: { field: { fieldPath: key }, op } });
        return this;
    }

    isNotNan(...keys: Array<string>): this {
        const op = 'IS_NOT_NAN';
        for (const key of keys) this.#filters.push({ unaryFilter: { field: { fieldPath: key }, op } });
        return this;
    }

    isNull(...keys: Array<string>): this {
        const op = 'IS_NULL';
        for (const key of keys) this.#filters.push({ unaryFilter: { field: { fieldPath: key }, op } });
        return this;
    }

    isNotNull(...keys: Array<string>): this {
        const op = 'IS_NOT_NULL';
        for (const key of keys) this.#filters.push({ unaryFilter: { field: { fieldPath: key }, op } });
        return this;
    }

    ascending(...keys: Array<string>): this {
        const direction = 'ASCENDING';
        if (!keys.length) keys.push('__name__');
        for (const key of keys) this.#orderBy.push({ field: { fieldPath: key }, direction });
        return this;
    }

    descending(...keys: Array<string>): this {
        const direction = 'DESCENDING';
        if (!keys.length) keys.push('__name__');
        for (const key of keys) this.#orderBy.push({ field: { fieldPath: key }, direction });
        return this;
    }

    /**
     * @link https://cloud.google.com/firestore/docs/reference/rest/v1/StructuredQuery#FIELDS.start_at
     * @param {string|Record} A document id or a Result with a document name using REFERENCE Symbol.
     * @returns {this}
     */
    startAt(data: string | Result): this {

        if (!this.#orderBy.length) {
            this.#orderBy.push({ field: { fieldPath: '__name__' }, direction: 'ASCENDING' });
        }

        if (typeof data === 'string') {
            this.#startAt.values.push({ referenceValue: `projects/${this.#project}/databases/${this.#id}/documents/${this.#collection}/${data}` });
        } else if (typeof data === 'object') {
            this.#startAt.values.push({ referenceValue: (data as any)[REFERENCE] });
        }

        return this;
    }

    /**
     *
     * @link https://cloud.google.com/firestore/docs/reference/rest/v1/StructuredQuery#FIELDS.end_at
     * @param {string|Record} A document id or a Result with a document name using the REFERENCE Symbol.
     * @returns {this}
     */
    endAt(data: string | Result): this {

        if (!this.#orderBy.length) {
            this.#orderBy.push({ field: { fieldPath: '__name__' }, direction: 'ASCENDING' });
        }

        if (typeof data === 'string') {
            this.#endAt.values.push({ referenceValue: `projects/${this.#project}/databases/${this.#id}/documents/${this.#collection}/${data}` });
        } else if (typeof data === 'object') {
            this.#endAt.values.push({ referenceValue: (data as any)[REFERENCE] });
        }

        return this;
    }

    end(): Promise<Array<Result>> {

        const filters = this.#filters;
        const collectionId = this.#collection;

        const endAt = this.#endAt.values.length ? this.#endAt : undefined;
        const startAt = this.#startAt.values.length ? this.#startAt : undefined;

        const orderBy = this.#orderBy.length ? this.#orderBy : undefined;

        const limit: number | undefined = this.#limit;
        const offset: number | undefined = this.#offset;
        const from: From = [{ collectionId }];
        const where: Where = { compositeFilter: { op: 'AND', filters } };
        const body = { structuredQuery: { from, where, limit, offset, orderBy, startAt, endAt } };

        return this.#end(body);
    }
}

// const kv = await Deno.openKv();
// kv.get()