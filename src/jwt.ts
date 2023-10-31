import { encodeBase64Url } from 'https://deno.land/std@0.204.0/encoding/base64url.ts';
import { decodeBase64 } from 'https://deno.land/std@0.204.0/encoding/base64.ts';

export type Header = {
    alg: 'RS256';
    [key: string]: unknown;
};

export type Payload = {
    iss: string;
    aud: string;
    exp: number;
    iat: number;
    scope: string;
};

const encoder = new TextEncoder();

export default async function (header: Header, payload: Payload, secret: string): Promise<string> {
    const encodedHeader = encodeBase64Url(JSON.stringify(header));
    const encodedPayload = encodeBase64Url(JSON.stringify(payload));
    const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);

    const cleanedKey = secret.replace(/^\n?-----BEGIN PRIVATE KEY-----\n?|\n?-----END PRIVATE KEY-----\n?$/g, '');
    const decodedKey = decodeBase64(cleanedKey).buffer;
    const key = await crypto.subtle.importKey('pkcs8', decodedKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, true, ['sign']);

    const signature = await crypto.subtle.sign({ hash: { name: 'SHA-256' }, name: 'RSASSA-PKCS1-v1_5' }, key, data);
    const encodedSignature = encodeBase64Url(signature);
    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}
