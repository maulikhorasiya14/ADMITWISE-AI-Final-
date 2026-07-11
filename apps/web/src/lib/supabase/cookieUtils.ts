type CookieToSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

type MutableCookieStore = {
  getAll?: () => CookieToSet[];
  set(name: string, value: string, options?: Record<string, unknown>): void;
};

const readOnlyCookieMessages = [
  "Cookies can only be modified in a Server Action or Route Handler",
  "ReadonlyRequestCookies cannot be modified"
];

export function isReadOnlyCookieMutationError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return readOnlyCookieMessages.some((message) => error.message.includes(message));
}

export function applyCookieUpdates(cookieStore: MutableCookieStore, cookiesToSet: CookieToSet[]) {
  cookiesToSet.forEach(({ name, value, options }) => {
    try {
      cookieStore.set(name, value, options);
    } catch (error) {
      if (isReadOnlyCookieMutationError(error)) {
        return;
      }

      throw error;
    }
  });
}

export function createServerCookieAdapter(cookieStore: MutableCookieStore & { getAll: () => CookieToSet[] }) {
  return {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet: CookieToSet[]) {
      applyCookieUpdates(cookieStore, cookiesToSet);
    }
  };
}

export function appendResponseCookies(
  requestCookieStore: MutableCookieStore,
  responseCookieStore: MutableCookieStore,
  cookiesToSet: CookieToSet[]
) {
  cookiesToSet.forEach(({ name, value }) => {
    requestCookieStore.set(name, value);
  });

  cookiesToSet.forEach(({ name, value, options }) => {
    responseCookieStore.set(name, value, options);
  });
}
