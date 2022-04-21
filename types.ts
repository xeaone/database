
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

export type Payload = {
    iss: string;
    aud: string;
    exp: number;
    iat: number;
    scope: string;
};

export type Header = {
    alg: 'RS256';
    [ key: string ]: unknown;
};

export type CustomOperator =
    's' | 'startswith' | 'startsWith' | 'STARTS_WITH' |
    'i' | 'in' | 'ni' | 'notin' | 'notIn' |
    'e' | 'equal' | 'ne' | 'notequal' | 'notEqual' |
    'l' | 'lessthan' | 'lessThan' | 'le' | 'lessthanorequal' | 'lessThanOrEqual' |
    'ac' | 'arraycontains' | 'arrayContains' | 'aca' | 'arraycontainsany' | 'arrayContainsAny' |
    'g' | 'greaterthan' | 'greaterThan' | 'ge' | 'greaterthanorequal' | 'greaterThanOrEqual';

// https://cloud.google.com/firestore/docs/reference/rest/v1/StructuredQuery#operator_1
export type FieldFilterOperator =
    'IN' | 'NOT_IN' |
    'EQUAL' | 'NOT_EQUAL' |
    'LESS_THAN' | 'LESS_THAN_OR_EQUAL' |
    'ARRAY_CONTAINS' | 'ARRAY_CONTAINS_ANY' |
    'GREATER_THAN' | 'GREATER_THAN_OR_EQUAL';

// IS_NAN
// IS_NULL
// IS_NOT_NAN
// IS_NOT_NULL

export type CompositeFilterOperator = 'AND' | 'OPERATOR_UNSPECIFIED';

// export type Value = null | undefined | boolean | string | number | any[] | { [ key: string ]: any; };
// export type Value = null | undefined | boolean | string | number | Value[] | { [ key: string ]: Value; };
// export type Value = null | undefined | boolean | string | number | Array<Value> | Record<string, Value>;

export type RemoveData = {
    id: string;
    [ key: string ]: any;
};

export type ViewData = {
    id: string;
    [ key: string ]: any;
};

export type UpdateData = {
    id: string;
    [ key: string ]: any;
};

export type CreateData = {
    id?: string;
    [ key: string ]: any;
};

export type ArrayValue = { values: Array<Value>; };
export type LatLng = { latitude: number, longitude: number; };
export type MapValue = { fields: { [ key: string ]: Value; }; };

export type Value =
    { nullValue: null; } | { booleanValue: boolean; } |
    { integerValue: string; } | { doubleValue: number; } |
    { timestampValue: string; } | { stringValue: string; } |
    { bytesValue: string; } | { referenceValue: string; } |
    { arrayValue: ArrayValue; } | { geoPointValue: LatLng; } | { mapValue: MapValue; };

export type StartAt = { values: Array<Value>; before?: boolean; };

export type Direction = 'ASCENDING' | 'DESCENDING' | 'DIRECTION_UNSPECIFIED';
export type FieldReference = { fieldPath: string; };
export type Order = { field: FieldReference; };
export type OrderBy = { field: FieldReference, direction?: Direction; }[];

export type From = [ { collectionId: string; } ];

export type SearchData = {

    $token?: { [ key: string ]: unknown; };
    $operator?: CustomOperator | { [ key: string ]: CustomOperator; };

    $where?: any;
    $endAt?: any;
    $limit?: number;
    $offset?: number;

    $from?: From;
    $startAt?: StartAt;
    $orderBy?: OrderBy;

    [ key: string ]: any;

};
