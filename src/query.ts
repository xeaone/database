import { Data, End, EndAt, FieldFilter, From, Result, StartAt, Where } from './types.ts';
import { serialize } from './util.ts';

export default class Query {
    #endQuery: End;
    #endIdentifier: End;
    #identifier?: string;
    #filters: Array<FieldFilter> = [];

    #project: string;
    #collection: string;

    #endAt: EndAt = { values: [], before: false };
    #startAt: StartAt = { values: [], before: false };

    constructor(project: string, collection: string, endQuery: End, endIdentifier: End) {
        this.#endQuery = endQuery;
        this.#project = project;
        this.#collection = collection;
        this.#endIdentifier = endIdentifier;
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

    identifier(identifier: string): this {
        this.#identifier = identifier;
        return this;
    }

    end(): Promise<Result> {
        if (!this.#collection) throw new Error('collection required');
        if (this.#filters.length && this.#identifier) throw new Error('filters and identifier');
        if (!this.#filters.length && !this.#identifier) throw new Error('filters or identifier');

        if (this.#identifier) return this.#endIdentifier(this.#identifier);

        const filters = this.#filters;
        const collectionId = this.#collection;

        const limit = 1;
        const from: From = [{ collectionId }];
        const where: Where = { compositeFilter: { op: 'AND', filters } };
        const body = { structuredQuery: { from, where, limit } };

        return this.#endQuery(body);
    }
}
