import {
    Operator,
    Order, Value, Direction,
    // FieldFilterOperator, CustomFieldFilterOperator
} from './types.ts';

export const OperatorFormat = function (operator: Operator): string {
    if (!operator) return 'EQUAL';

    else if (/^(s|starts_?with)$/i.test(operator)) return 'STARTS_WITH';

    else if (/^(i|in)$/i.test(operator)) return 'IN';
    else if (/^(ni|not_?in)$/i.test(operator)) return 'NOT_IN';

    else if (/^(e|equal)$/i.test(operator)) return 'EQUAL';
    else if (/^(ne|not_?equal)$/i.test(operator)) return 'NOT_EQUAL';

    else if (/^(l|less_?than)$/i.test(operator)) return 'LESS_THAN';
    else if (/^(le|less_?than_?or_?equal)$/i.test(operator)) return 'LESS_THAN_OR_EQUAL';

    else if (/^(ac|array_?contains)$/i.test(operator)) return 'ARRAY_CONTAINS';
    else if (/^(aca|array_?contains_?any)$/i.test(operator)) return 'ARRAY_CONTAINS_ANY';

    else if (/^(g|greater_?than)$/i.test(operator)) return 'GREATER_THAN';
    else if (/^(ge|greater_?than_?or_?equal)$/i.test(operator)) return 'GREATER_THAN_OR_EQUAL';

    else return operator;
};

export const OrderFormat = (data: string, direction?: Direction): Order => {
    return { field: { fieldPath: data }, direction };
};

export const ValueFormat = (data: any, path?: string): Value => {
    if (data === null) {
        return { nullValue: data };
    } else if (typeof data === 'string') {
        return { stringValue: data };
    } else if (typeof data === 'boolean') {
        return { booleanValue: data };
    } else if (typeof data === 'number' && data % 1 !== 0) {
        return { doubleValue: data };
    } else if (typeof data === 'number' && data % 1 === 0) {
        return { integerValue: `${data}` };
    } else if (data instanceof Date) {
        return { timestampValue: data.toISOString() };
    } else if (data instanceof Array) {
        const values = data.map((d, i) => ValueFormat(d, `${path}.${i}`));
        return { arrayValue: { values } };
    } else if (typeof data === 'object') {
        const fields = Object.fromEntries(Object.entries(data).map(([ k, v ]) => [ k, ValueFormat(v, `${path}.${k}`) ]));
        return { mapValue: { fields } };
    } else {
        throw new Error(`value not allowed ${data}`);
    }
};

export const DocumentFormat = function (data: any, constant?: string[], mask?: string[]) {
    const fields: Record<string, Value> = {};

    for (const key in data) {
        const value = data[ key ];
        if (value === undefined) continue;
        if (key !== 'id' && !constant?.includes(key)) mask?.push(key);
        fields[ key ] = ValueFormat(value, key);
    }

    return { fields };
};

export const DirectionFormat = function (direction?: Direction): string {
    if (direction === 'a') return 'ASCENDING';
    if (direction === 'd') return 'DESCENDING';
    if (direction) return direction.toUpperCase();
    return 'ASCENDING';
};