// Pure helpers for GitHub App (installation) authentication. Kept dependency-free
// so the JWT + token-resolution logic can be unit tested outside of a Vercel
// serverless context (see githubAuthLogic.test.ts).
import { createSign, createPrivateKey } from 'node:crypto';

export type GithubAuthConfig = {
  GITHUB_TOKEN?: string;
  GITHUB_ACCESS_TOKEN?: string;
  GITHUB_APP_ID?: string;
  GITHUB_APP_PRIVATE_KEY?: string;
  GITHUB_APP_INSTALLATION_ID?: string;
};

/**
 * Sign a GitHub App JWT (RS256) following GitHub's spec: header {alg: RS256,
 * typ: JWT} and payload {iat, exp, iss} where iss is the app id, iat/exp in
 * seconds and exp-iat must be <= 600s.
 */
export function createAppJwt(appId: string, privateKeyPem: string, nowSeconds = Math.floor(Date.now() / 1000)): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const iat = nowSeconds - 60;
  const exp = iat + 600;
  const payload = { iat, exp, iss: appId };

  const encode = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const signingInput = `${encode(header)}.${encode(payload)}`;

  const key = createPrivateKey(privateKeyPem);
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = signer.sign(key).toString('base64url');

  return `${signingInput}.${signature}`;
}

/**
 * Resolve the auth strategy to use given the environment config:
 * - 'app' when GitHub App env vars are present (installation token preferred)
 * - 'token' when a classic/fine-grained PAT is available
 * - 'none' otherwise
 */
export function resolveGithubAuthMode(config: GithubAuthConfig): 'app' | 'token' | 'none' {
  const appConfigured = !!(config.GITHUB_APP_ID && config.GITHUB_APP_PRIVATE_KEY);
  if (appConfigured) return 'app';
  if (config.GITHUB_TOKEN || config.GITHUB_ACCESS_TOKEN) return 'token';
  return 'none';
}

/**
 * Smaller of the configured PATs (GITHUB_TOKEN preferred, then access token).
 * Returns undefined when neither is set.
 */
export function resolvePatToken(config: GithubAuthConfig): string | undefined {
  return config.GITHUB_TOKEN || config.GITHUB_ACCESS_TOKEN || undefined;
}

/**
 * The installation id is required to mint an installation token. It can be
 * provided explicitly (GITHUB_APP_INSTALLATION_ID) or we fall back to the
 * first installation GitHub returns for the app (queried at runtime). This
 * helper just captures which explicit value we have, if any.
 */
export function resolveInstallationId(config: GithubAuthConfig): string | undefined {
  return config.GITHUB_APP_INSTALLATION_ID || undefined;
}