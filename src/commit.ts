import { ArrayValue, Data, End, FieldTransform, Value } from './types.ts';
import { serialize } from './util.ts';

export default class Commit {
    #end: End;
    #data: Data;
    #project: string;
    #collection: string;
    #identifier?: string;
    #updateTransforms: Array<FieldTransform> = [];

    constructor(project: string, collection: string, data: Data, end: End) {
        this.#end = end;
        this.#data = data;
        this.#project = project;
        this.#collection = collection;
    }

    increment(data: Data): this {
        for (const key in data) this.#updateTransforms.push({ fieldPath: key, increment: serialize(data[key]) });
        return this;
    }

    append(data: Data): this {
        for (const key in data) {
            const appendMissingElements = (serialize(data[key]) as { arrayValue: ArrayValue })?.arrayValue;
            this.#updateTransforms.push({ fieldPath: key, appendMissingElements });
        }
        return this;
    }

    clear(data: Data): this {
        for (const key in data) {
            const removeAllFromArray = (serialize(data[key]) as { arrayValue: ArrayValue })?.arrayValue;
            this.#updateTransforms.push({ fieldPath: key, removeAllFromArray });
        }
        return this;
    }

    identifier(identifier: string): this {
        this.#identifier = identifier;
        return this;
    }

    end(): void {
        if (!this.#identifier) throw new Error('identifier required');

        const fieldPaths: Array<string> = [];
        const fields: Record<string, Value> = {};
        for (const key in this.#data) {
            const value = this.#data[key];
            fieldPaths.push(key);
            if (value === undefined) continue;
            fields[key] = serialize(value);
        }

        const name = `projects/${this.#project}/databases/(default)/documents/${this.#collection}/${this.#identifier}`;
        const body = { writes: [{ updateTransforms: this.#updateTransforms, update: { fields, name }, updateMask: { fieldPaths } }] };

        return this.#end(body);
    }
}
