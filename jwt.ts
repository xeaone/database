import * as base64url from 'https://deno.land/std@0.144.0/encoding/base64url.ts';
import * as base64 from 'https://deno.land/std@0.144.0/encoding/base64.ts';

export type Header = {
    alg: 'RS256';
    [ key: string ]: unknown;
};

export type Payload = {
    iss: string;
    aud: string;
    exp: number;
    iat: number;
    scope: string;
};

const encoder = new TextEncoder();

export default async function (header: Header, payload: Payload, key: string): Promise<string> {
    const encodedHeader = base64url.encode(JSON.stringify(header));
    const encodedPayload = base64url.encode(JSON.stringify(payload));
    const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);

    const cleanedKey = key.replace(/^\n?-----BEGIN PRIVATE KEY-----\n?|\n?-----END PRIVATE KEY-----\n?$/g, '');
    const decodedKey = base64.decode(cleanedKey).buffer;
    const rsaKey = await crypto.subtle.importKey('pkcs8', decodedKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, true, [ 'sign' ]);

    const signature = await crypto.subtle.sign({ hash: { name: 'SHA-256' }, name: 'RSASSA-PKCS1-v1_5' }, rsaKey, data);
    const encodedSignature = base64url.encode(signature);
    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}