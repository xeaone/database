import { REFERENCE } from './util.ts';

// https://developers.google.com/identity/protocols/oauth2/service-account
export type ServiceAccountCredentials = {
    type: 'service_account';
    project_id: string;
    private_key_id: string;
    private_key: string;
    client_email: string;
    client_id: string;
    auth_uri?: string;
    token_uri?: string;
    client_x509_cert_url?: string;
    auth_provider_x509_cert_url?: string;
};

// https://developers.google.com/identity/protocols/oauth2/web-server#offline
export type ApplicationDefaultCredentials = {
    type: 'authorized_user';
    client_id: string;
    client_secret: string;
    grant_type: string;
    refresh_token: string;
};

export type Credential = 'meta' | 'application' | ApplicationDefaultCredentials | ServiceAccountCredentials;

export type Options = {
    project?: string,
    timeout?: number,
    attempts?: number,
    serviceAccountCredentials?: ServiceAccountCredentials,
    applicationDefaultCredentials?: ApplicationDefaultCredentials,
};

export type UnaryOperator = 'IS_NAN' | 'IS_NOT_NAN' | 'IS_NULL' | 'IS_NOT_NULL';

export type Operator = 'IN' | 'NOT_IN' | 'EQUAL' | 'NOT_EQUAL' | 'LESS_THAN' | 'LESS_THAN_OR_EQUAL' | 'ARRAY_CONTAINS' | 'ARRAY_CONTAINS_ANY' | 'GREATER_THAN' | 'GREATER_THAN_OR_EQUAL';

export type Direction = 'ASCENDING' | 'DESCENDING';

export type ArrayValue = { values: Array<Value> };
export type LatLng = { latitude: number; longitude: number };
export type MapValue = { fields: { [key: string]: Value } };
export type Value = { nullValue: null } | { booleanValue: boolean } | { integerValue: string } | { doubleValue: number } | { timestampValue: string } | { stringValue: string } | { bytesValue: string } | { referenceValue: string } | { arrayValue: ArrayValue } | { geoPointValue: LatLng } | { mapValue: MapValue };

export type From = { collectionId: string }[];
export type FieldReference = { fieldPath: string };
export type StartAt = { values: Value[]; before?: boolean };
export type EndAt = { values: Value[]; before?: boolean };
export type Order = { field: FieldReference; direction: Direction };
export type OrderBy = Order[];
export type UnaryFilter = { unaryFilter: { op: UnaryOperator; field: FieldReference } };
export type FieldFilter = { fieldFilter: { op: Operator; field: FieldReference; value: Value } };
export type Where = { compositeFilter: { op: 'AND'; filters: Array<FieldFilter | UnaryFilter> } };

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

export type End = (result: any) => Promise<any>;
// export type End = (result: any) => any;

// export type Data = Record<string | number | symbol, any>;
// export type Result = Record<string | number | symbol, any>;

export type Data = {
    [key: string | number | symbol]: any;
};

export type Result = {
    [REFERENCE]?: string;
    [key: string | number | symbol]: any;
};
