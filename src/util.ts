import {
    // FieldFilter, Direction, Operator, Order,
    Value,
} from './types.ts';

const properties = [
    'integerValue',
    'doubleValue',
    'arrayValue',
    'bytesValue',
    'booleanValue',
    'geoPointValue',
    'mapValue',
    'nullValue',
    'referenceValue',
    'stringValue',
    'timestampValue',
];

export const parse = (value: any): any => {
    const keys = Object.keys(value);
    const property = keys.find((key) => properties.includes(key));

    if (property === 'nullValue') {
        value = null;
    } else if (property === 'booleanValue') {
        return value[property];
    } else if (property === 'integerValue') {
        return Number(value[property]);
    } else if (property === 'doubleValue') {
        return value[property];
    } else if (property === 'arrayValue') {
        return (value[property] && value[property].values || []).map(parse.bind(this));
    } else if (property === 'mapValue') {
        return parse(value[property] && value[property].fields || {});
    } else if (property === 'geoPointValue') {
        return { latitude: 0, longitude: 0, ...value[property] };
    } else if (property === 'timestampValue') {
        return new Date(value[property]);
    } else if (property === 'stringValue') {
        return value[property];
    } else if (value === undefined) {
        return undefined;
    } else if (property === 'referenceValue' || property === 'byteValue') {
        throw new Error(`${property} not implenmeted yet`);
    } else if (typeof value === 'object') {
        keys.forEach((key) => value[key] = parse(value[key]));
    }

    return value;
};

export const serialize = (value: any): Value => {
    if (value === null) {
        return { nullValue: value };
    }
    if (typeof value === 'string') {
        return { stringValue: value };
    }
    if (typeof value === 'boolean') {
        return { booleanValue: value };
    }
    if (typeof value === 'number' && value % 1 !== 0) {
        return { doubleValue: value };
    }
    if (typeof value === 'number' && value % 1 === 0) {
        return { integerValue: `${value}` };
    }
    if (value instanceof Date) {
        return { timestampValue: value.toISOString() };
    }
    if (value instanceof Array) {
        return { arrayValue: { values: value.map(serialize) } };
    }
    if (typeof value === 'object') {
        return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialize(v)])) } };
    }
    throw new Error(`value not allowed ${value}`);
};

// export const filters = (filters: Array<FieldFilter>, operator: Operator, key: string, value: any) => {
//     filters.push({
//         fieldFilter: {
//             op: operator,
//             field: { fieldPath: key },
//             value: serialize(value),
//         }
//     });
// };
