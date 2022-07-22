
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

export type Rule = (data: any) => void;
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

export type CustomFieldFilterOperator = 'STARTS_WITH';

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

export type From = { collectionId: string; }[];
export type FieldReference = { fieldPath: string; };
export type StartAt = { values: Value[]; before?: boolean; };
export type EndAt = { values: Value[]; before?: boolean; };
export type Order = { field: FieldReference; direction?: Direction; };
export type OrderBy = { field: FieldReference, direction?: Direction; }[];
export type FieldFilter = { fieldFilter: { op: Operator; field: FieldReference, value: Value; }; };
export type Filters = FieldFilter[];
export type Where = { compositeFilter: { op: 'AND'; filters: Filters; }; };

// export type ResultValue = string | number | boolean | null | ResultArray | ResultRecord;
// export type ResultArray = Array<ResultValue>;
// export type ResultRecord = Record<string, ResultValue>;

export type ResultArray = Array<any>;
export type ResultRecord = Record<string, any>;

export type RemoveData = {
    id: string;
    $rule?: boolean;
    [ key: string ]: any;
};

export type ViewData = {
    // id?: string;
    $rule?: boolean;
    [ key: string ]: any;
};

export type CreateData = {
    id?: string;
    $rule?: boolean;
    [ key: string ]: any;
};

export type UpdateData = {
    id: string;
    $rule?: boolean;
    $operator: Record<string, Operator>;
    [ key: string ]: any;
};

export type SetData = {
    id?: string;
    $rule?: boolean;
    $increment?: string | string[]; // property name/s to increment
    [ key: string ]: any;
};

export type SearchData = {

    $rule?: boolean; // disable rule
    $token?: Record<string, any>; // record to start the search pagination
    // $operator?: Operator | Record<string, Operator>; // define operators
    // $direction?: Direction | Record<string, Direction>; // order records

    $where?: Record<string, Operator>;
    $order?: Record<string, Direction>;

    // $where?: any; // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.where
    // $from?: From; // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.from
    // $endAt?: EndAt; // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.end_at
    // $startAt?: StartAt; // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.start_at
    // $orderBy?: OrderBy; // Firestore: https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.order_by
    // $offset?: number; // Firestore: The number of results to skip. https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.offset
    // $limit?: number; // Firestore: The maximum number of results to return. https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery#FIELDS.limit

    [ key: string ]: any;

};
