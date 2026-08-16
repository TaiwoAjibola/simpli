import { describe, it, expect } from 'vitest';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import {
  createAppJwt,
  resolveGithubAuthMode,
  resolvePatToken,
  resolveInstallationId
} from './githubAuthLogic';

function makeKeyPair() {
  return generateKeyPairSync('rsa', { modulusLength: 2048 });
}

describe('createAppJwt', () => {
  it('produces a three-part base64url token', () => {
    const { publicKey, privateKey } = makeKeyPair();
    const jwt = createAppJwt('123', privateKey.export({ type: 'pkcs1', format: 'pem' }).toString(), 1_000_000);
    const parts = jwt.split('.');
    expect(parts).toHaveLength(3);
    expect(parts[0]).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(parts[1]).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(parts[2]).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('encodes expected header and payload while signing with RS256', () => {
    const { publicKey, privateKey } = makeKeyPair();
    const pem = privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();
    const now = 1_000_000;
    const jwt = createAppJwt('987', pem, now);

    const [h, p, s] = jwt.split('.');
    expect(JSON.parse(Buffer.from(h, 'base64url').toString())).toEqual({ alg: 'RS256', typ: 'JWT' });

    const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
    expect(payload.iss).toBe('987');
    expect(payload.iat).toBe(now - 60);
    expect(payload.exp).toBe(payload.iat + 600);
    expect(payload.exp - payload.iat).toBeLessThanOrEqual(600);

    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${h}.${p}`);
    verifier.end();
    expect(verifier.verify(publicKey, Buffer.from(s, 'base64url'))).toBe(true);
  });

  it('handles private keys provided in PKCS8 PEM form (typical Vercel env)', () => {
    const { publicKey, privateKey } = makeKeyPair();
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const jwt = createAppJwt('1', pem);
    const [h, p, s] = jwt.split('.');
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${h}.${p}`);
    verifier.end();
    expect(verifier.verify(publicKey, Buffer.from(s, 'base64url'))).toBe(true);
  });
});

describe('resolveGithubAuthMode', () => {
  it('prefers app mode when app vars are present', () => {
    expect(resolveGithubAuthMode({ GITHUB_APP_ID: '1', GITHUB_APP_PRIVATE_KEY: 'x' })).toBe('app');
    expect(resolveGithubAuthMode({ GITHUB_APP_ID: '1', GITHUB_APP_PRIVATE_KEY: 'x', GITHUB_TOKEN: 't' })).toBe('app');
  });

  it('falls back to token mode when no app vars', () => {
    expect(resolveGithubAuthMode({ GITHUB_TOKEN: 't' })).toBe('token');
    expect(resolveGithubAuthMode({ GITHUB_ACCESS_TOKEN: 't' })).toBe('token');
  });

  it('reports none when nothing is configured', () => {
    expect(resolveGithubAuthMode({})).toBe('none');
    expect(resolveGithubAuthMode({ GITHUB_APP_ID: '1' })).toBe('none');
    expect(resolveGithubAuthMode({ GITHUB_APP_PRIVATE_KEY: 'x' })).toBe('none');
  });
});

describe('resolvePatToken', () => {
  it('prefers GITHUB_TOKEN over GITHUB_ACCESS_TOKEN', () => {
    expect(resolvePatToken({ GITHUB_TOKEN: 'a', GITHUB_ACCESS_TOKEN: 'b' })).toBe('a');
    expect(resolvePatToken({ GITHUB_ACCESS_TOKEN: 'b' })).toBe('b');
    expect(resolvePatToken({})).toBeUndefined();
  });
});

describe('resolveInstallationId', () => {
  it('returns the explicit installation id or undefined', () => {
    expect(resolveInstallationId({ GITHUB_APP_INSTALLATION_ID: '42' })).toBe('42');
    expect(resolveInstallationId({})).toBeUndefined();
  });
});