
// export type Options = {
//     key?: Key;
//     project?: string;
//     scope?: Array<string>;
//     constant?: Array<string>;
// };

export type Key = {
    type?: string;
    project_id?: string;
    private_key_id?: string;
    private_key: string;
    client_email: string;
    client_id?: string;
    auth_uri?: string;
    token_uri?: string;
    auth_provider_x509_cert_url?: string;
    client_x509_cert_url?: string;
};

export type FieldFilterOperator =
    // IS_NAN IS_NULL IS_NOT_NAN IS_NOT_NULL
    'IN' | 'NOT_IN' |
    'EQUAL' | 'NOT_EQUAL' |
    'LESS_THAN' | 'LESS_THAN_OR_EQUAL' |
    'ARRAY_CONTAINS' | 'ARRAY_CONTAINS_ANY' |
    'GREATER_THAN' | 'GREATER_THAN_OR_EQUAL';

export type CompositeFilterOperator = 'AND';
export type OrderDirection = 'ASCENDING' | 'DESCENDING';

export type ArrayValue = { values: Value[]; };
export type LatLng = { latitude: number, longitude: number; };
export type MapValue = { fields: { [ key: string ]: Value; }; };

export type Value =
    { nullValue: null; } | { booleanValue: boolean; } |
    { integerValue: string; } | { doubleValue: number; } |
    { timestampValue: string; } | { stringValue: string; } |
    { bytesValue: string; } | { referenceValue: string; } |
    { arrayValue: ArrayValue; } | { geoPointValue: LatLng; } | { mapValue: MapValue; };

export type From = { collectionId: string; }[];
export type FieldReference = { fieldPath: string; };
export type StartAt = { values: Value[]; before?: boolean; };
export type EndAt = { values: Value[]; before?: boolean; };
export type Order = { field: FieldReference; direction: OrderDirection; };
export type OrderBy = Order[];
export type FieldFilter = { fieldFilter: { op: Operator; field: FieldReference, value: Value; }; };
export type Filters = FieldFilter[];
export type Where = { compositeFilter: { op: 'AND'; filters: Filters; }; };

// export type ResultValue = string | number | boolean | null | ResultArray | ResultRecord;
// export type ResultArray = Array<ResultValue>;
// export type ResultRecord = Record<string, ResultValue>;

export type Data = Record<string, any>;
export type Rule = (data: Data, options: Options) => void;
export type Action = '*' | 'set' | 'view' | 'search' | 'create' | 'update' | 'remove';
export type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
export type Direction = 'a' | 'd' | 'ascending' | 'descending' | 'ASCENDING' | 'DESCENDING';

export type Operator =
    's' | 'startsWith' | 'STARTS_WITH' |
    'i' | 'in' | 'IN' |
    'ni' | 'notIn' | 'NOT_IN' |
    'e' | 'equal' | 'EQUAL' |
    'ne' | 'notEqual' | 'NOT_EQUAL' |
    'l' | 'lessThan' | 'LESS_THAN' |
    'le' | 'lessThanOrEqual' | 'LESS_THAN_OR_EQUAL' |
    'ac' | 'arrayContains' | 'ARRAY_CONTAINS' |
    'aca' | 'arrayContainsAny' | 'ARRAY_CONTAINS_ANY' |
    'g' | 'greaterThan' | 'GREATER_THAN' |
    'ge' | 'greaterThanOrEqual' | 'GREATER_THAN_OR_EQUAL';

export type ResultArray = Array<Data>;
export type ResultRecord = Record<string, Data>;

export type Options = {

    rule?: boolean; // All: disable rule

    id?: string; // All except Search:
    where?: Record<string, Operator>; // All except Set:

    increment?: string | string[]; // Set: property name/s to increment

    limit?: number; // Search: limit the number of documents
    offset?: number;// Search: offset the number of documents
    token?: Record<string, Data>; // Search: record to start the search pagination
    order?: Record<string, Direction>; // Search: properties to order

    // where?: // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.where
    // from?: From; // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.from
    // endAt?: EndAt; // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.end_at
    // startAt?: StartAt; // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.start_at
    // orderBy?: OrderBy; // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.order_by
    // offset?: number; // Firestore: The number of results to skip. https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.offset
    // limit?: number; // Firestore: The maximum number of results to return. https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.limit

};
