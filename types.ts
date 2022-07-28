
export type Options = {
    key?: Key;
    project?: string;
};

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

export type Operator =
    // IS_NAN IS_NULL IS_NOT_NAN IS_NOT_NULL
    'IN' | 'NOT_IN' |
    'EQUAL' | 'NOT_EQUAL' |
    'LESS_THAN' | 'LESS_THAN_OR_EQUAL' |
    'ARRAY_CONTAINS' | 'ARRAY_CONTAINS_ANY' |
    'GREATER_THAN' | 'GREATER_THAN_OR_EQUAL';

export type Direction = 'ASCENDING' | 'DESCENDING';

export type ArrayValue = { values: Array<Value>; };
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
export type Order = { field: FieldReference; direction: Direction; };
export type OrderBy = Order[];
export type FieldFilter = { fieldFilter: { op: Operator; field: FieldReference, value: Value; }; };
export type Filters = FieldFilter[];
export type Where = { compositeFilter: { op: 'AND'; filters: Filters; }; };

export type FieldTransform = {
    fieldPath: string;
    maximum?: Value;
    minimum?: Value;
    increment?: Value;
    removeAllFromArray?: ArrayValue;
    appendMissingElements?: ArrayValue;
};

export type On = (data: Data, collection: string) => void;
export type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
export type Action = 'set' | 'view' | 'search' | 'create' | 'update' | 'remove';

export type Results = Array<any>;
export type Result = Record<string, any>;

export type Data = {

    // All: false overrides the event
    $on?: boolean;

    // All Except Search: Overrides filters
    $identifier?: string;


    // Set: property name/s to increment
    // https://firebase.google.com/docs/firestore/reference/rest/v1/Write#FieldTransform.FIELDS.increment
    $increment?: Array<string>;

    // Set: property name/s to append missing elements
    // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/Write#FieldTransform.FIELDS.append_missing_elements
    $append?: Array<string>;


    // Custom Filters - START
    $startsWith?: Array<string>;
    // Custom Filters - END


    // Standard Filters - START

    // All Except Set:
    $in?: Array<string>;

    // All Except Set:
    $notIn?: Array<string>;

    // All Except Set:
    $equal?: Array<string>;

    // All Except Set:
    $notEqual?: Array<string>;

    // All Except Set:
    $lessThan?: Array<string>;

    // All Except Set:
    $lessThanOrEqual?: Array<string>;

    // All Except Set:
    $arrayContains?: Array<string>;

    // All Except Set:
    $arrayContainsAny?: Array<string>;

    // All Except Set:
    $greaterThan?: Array<string>;

    // All Except Set:
    $greaterThanOrEqual?: Array<string>;

    // Standard Filters - End


    // Search: orders results by property name/s
    $ascending?: Array<string>; // All except Set:
    $descending?: Array<string>; // All except Set:

    // Search:
    // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.start_at
    $start?: Array<Record<string, any>>;

    // Search:
    // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.end_at
    $end?: Array<Record<string, any>>;

    // Search: The maximum number of results to return.
    // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.limit
    $limit?: number;

    // Search: The number of results to skip.
    // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.offset
    $offset?: number;

    [ key: string ]: any;
};
