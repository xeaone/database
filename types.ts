
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

export type FieldFilterOperator =
    'OPERATOR_UNSPECIFIED' |
    'LESS_THAN' |
    'LESS_THAN_OR_EQUAL' |
    'GREATER_THAN' |
    'GREATER_THAN_OR_EQUAL' |
    'EQUAL' |
    'NOT_EQUAL' |
    'ARRAY_CONTAINS' |
    'IN' |
    'ARRAY_CONTAINS_ANY' |
    'NOT_IN';

export type CompositeFilterOperator = 'AND' | 'OPERATOR_UNSPECIFIED';

export type FieldReference = {
    fieldPath: string;
};

export type OrderBy = {
    field: FieldReference,
    direction?: 'ASCENDING' | 'DESCENDING' | 'DIRECTION_UNSPECIFIED';
};

export type Value = null | undefined | boolean | string | number |
    Date | Value[] | { [ key: string ]: Value; };

export type RemoveData = {
    id: string;
    [ key: string ]: Value;
};

export type ViewData = {
    id: string;
    [ key: string ]: Value;
};

export type UpdateData = {
    id: string;
    [ key: string ]: Value;
};

export type CreateData = {
    id?: string;
    [ key: string ]: Value;
};

export type SearchData = {
    $from?: any;
    $where?: any;
    $endAt?: any;
    $startAt?: any;
    $limit?: number;
    $offset?: number;
    $orderBy?: any | OrderBy[];
    [ key: string ]: Value;
};

// export interface LatLng {
//     latitude: number;
//     longitude: number;
// }

// export type ArrayValue = {
//     values: Partial<Value>[];
// };

// export type MapValue = {
//     fields: {
//         [ key: string ]: Partial<Value>;
//     };
// };

// export type Value = {
//     nullValue: null;
//     booleanValue: boolean;
//     integerValue: string;
//     doubleValue: number;
//     timestampValue: string | Date;
//     stringValue: string;
//     bytesValue: string;
//     referenceValue: string;
//     geoPointValue: LatLng;
//     arrayValue: ArrayValue;
//     mapValue: MapValue;
// };

