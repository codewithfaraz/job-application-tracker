const LOCAL_ORIGIN = "https://job-crm.local";

export function sanitizeRedirectPath(
  value: string | null | undefined,
  fallback = "/dashboard",
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001F\u007F]/.test(value)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(value, LOCAL_ORIGIN);

    if (parsed.origin !== LOCAL_ORIGIN) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function loginPathFor(nextPath: string) {
  const params = new URLSearchParams({
    next: sanitizeRedirectPath(nextPath),
  });

  return `/login?${params.toString()}`;
}
