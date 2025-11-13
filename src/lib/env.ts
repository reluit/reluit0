const cache = new Map<string, string>();

function getEnvVar(name: string): string | undefined {
  if (cache.has(name)) {
    return cache.get(name);
  }

  const value = process.env[name];
  if (value !== undefined) {
    cache.set(name, value);
  }

  return value;
}

function assertEnv(name: string, value: string | undefined): string {
  if (value === undefined || value === "") {
    throw new Error(`Environment variable ${name} is required but not set.`);
  }

  return value;
}

export function getRequiredServerEnv(name: string): string {
  return assertEnv(name, getEnvVar(name));
}

export function getOptionalServerEnv(name: string, fallback?: string): string | undefined {
  const value = getEnvVar(name);
  if (value === undefined || value === "") {
    return fallback;
  }

  return value;
}

export const ROOT_DOMAIN = getOptionalServerEnv("ROOT_DOMAIN", "reluit.com")!;
export const ADMIN_SUBDOMAIN = getOptionalServerEnv("ADMIN_SUBDOMAIN", "admin")!;

