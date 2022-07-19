
export type Options = {
    key?: Key;
    project?: string;
    scope?: Array<string>;
    constant?: Array<string>;
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

export type Direction = 'a' | 'd' | 'ascending' | 'descending' | 'ASCENDING' | 'DESCENDING';

export type Operator =
    's' | 'startswith' | 'startsWith' | 'STARTS_WITH' |
    'i' | 'in' | 'ni' | 'notin' | 'notIn' |
    'e' | 'equal' | 'ne' | 'notequal' | 'notEqual' |
    'l' | 'lessthan' | 'lessThan' | 'le' | 'lessthanorequal' | 'lessThanOrEqual' |
    'ac' | 'arraycontains' | 'arrayContains' | 'aca' | 'arraycontainsany' | 'arrayContainsAny' |
    'g' | 'greaterthan' | 'greaterThan' | 'ge' | 'greaterthanorequal' | 'greaterThanOrEqual';

// https://cloud.google.com/firestore/docs/reference/rest/v1/StructuredQuery#operator_1
export type FieldFilterOperator =
    // IS_NAN IS_NULL IS_NOT_NAN IS_NOT_NULL
    'IN' | 'NOT_IN' |
    'EQUAL' | 'NOT_EQUAL' |
    'LESS_THAN' | 'LESS_THAN_OR_EQUAL' |
    'ARRAY_CONTAINS' | 'ARRAY_CONTAINS_ANY' |
    'GREATER_THAN' | 'GREATER_THAN_OR_EQUAL';

export type CompositeFilterOperator = 'AND' | 'OPERATOR_UNSPECIFIED';

export type ArrayValue = { values: Array<Value>; };
export type LatLng = { latitude: number, longitude: number; };
export type MapValue = { fields: { [ key: string ]: Value; }; };

export type Value =
    { nullValue: null; } | { booleanValue: boolean; } |
    { integerValue: string; } | { doubleValue: number; } |
    { timestampValue: string; } | { stringValue: string; } |
    { bytesValue: string; } | { referenceValue: string; } |
    { arrayValue: ArrayValue; } | { geoPointValue: LatLng; } | { mapValue: MapValue; };

export type From = [ { collectionId: string; } ];
export type FieldReference = { fieldPath: string; };
export type StartAt = { values: Array<Value>; before?: boolean; };
export type Order = { field: FieldReference; direction?: Direction; };
export type OrderBy = { field: FieldReference, direction?: Direction; }[];

// export type Result = { [ key: string | number ]: string | number | boolean | Result; } | Array<string | number | boolean | Result> | null;

export type RemoveData = {
    id: string;
    [ key: string ]: any;
};

export type ViewData = {
    id: string;
    $scope?: boolean;
    [ key: string ]: any;
};

export type CreateData = {
    id?: string;
    $scope?: boolean;
    [ key: string ]: any;
};

export type UpdateData = {
    id: string;
    $scope?: boolean;
    [ key: string ]: any;
};

export type SetData = {
    id?: string;
    $scope?: boolean;
    $increment?: string | string[]; // property name/s to increment
    [ key: string ]: any;
};

export type SearchData = {

    $scope?: boolean;
    $token?: { [ key: string ]: unknown; };
    $direction?: Direction | { [ key: string ]: Direction; };
    $operator?: Operator | { [ key: string ]: Operator; };

    $where?: any; // Firestore
    $endAt?: any; // Firestore
    $limit?: number; // Firestore: The maximum number of results to return.
    $offset?: number; // Firestore: The number of results to skip.

    $from?: From; // Firestore
    $startAt?: StartAt; // Firestore
    $orderBy?: OrderBy; // Firestore

    [ key: string ]: any;

};
