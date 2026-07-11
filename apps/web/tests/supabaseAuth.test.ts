import assert from "node:assert/strict";
import test from "node:test";
import {
  appendResponseCookies,
  applyCookieUpdates,
  createServerCookieAdapter,
  isReadOnlyCookieMutationError
} from "../src/lib/supabase/cookieUtils.ts";
import { serviceRoleAuthOptions } from "../src/lib/supabase/adminCore.ts";
import { getBrowserEnv } from "../src/lib/env.ts";

test("server cookie adapter can read cookies in a Server Component context", () => {
  const adapter = createServerCookieAdapter({
    getAll: () => [{ name: "sb-access-token", value: "token" }],
    set: () => undefined
  });

  assert.deepEqual(adapter.getAll(), [{ name: "sb-access-token", value: "token" }]);
});

test("read-only Server Component cookie write failure is safely ignored", () => {
  const cookieStore = {
    getAll: () => [],
    set: () => {
      throw new Error("Cookies can only be modified in a Server Action or Route Handler");
    }
  };

  assert.doesNotThrow(() => {
    applyCookieUpdates(cookieStore, [{ name: "sb-refresh-token", value: "new-token" }]);
  });
});

test("unexpected cookie write errors are still thrown", () => {
  const cookieStore = {
    getAll: () => [],
    set: () => {
      throw new Error("disk is full");
    }
  };

  assert.throws(
    () => applyCookieUpdates(cookieStore, [{ name: "sb-refresh-token", value: "new-token" }]),
    /disk is full/
  );
});

test("middleware-style cookie propagation copies refreshed cookies to request and response", () => {
  const requestCookies: Array<{ name: string; value: string; options?: Record<string, unknown> }> = [];
  const responseCookies: Array<{ name: string; value: string; options?: Record<string, unknown> }> = [];

  appendResponseCookies(
    {
      set: (name, value, options) => {
        requestCookies.push({ name, value, options });
      }
    },
    {
      set: (name, value, options) => {
        responseCookies.push({ name, value, options });
      }
    },
    [{ name: "sb-access-token", value: "updated", options: { path: "/" } }]
  );

  assert.deepEqual(requestCookies, [{ name: "sb-access-token", value: "updated", options: undefined }]);
  assert.deepEqual(responseCookies, [{ name: "sb-access-token", value: "updated", options: { path: "/" } }]);
});

test("browser environment never exposes the service-role key", () => {
  const previous = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY
  };

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";

  try {
    const browserEnv = getBrowserEnv();
    assert.equal("SUPABASE_SERVICE_ROLE_KEY" in browserEnv, false);
  } finally {
    process.env.NEXT_PUBLIC_SUPABASE_URL = previous.url;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previous.anon;
    process.env.NEXT_PUBLIC_APP_URL = previous.appUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = previous.serviceRole;
  }
});

test("privileged service-role client config disables session persistence", () => {
  assert.equal(serviceRoleAuthOptions.autoRefreshToken, false);
  assert.equal(serviceRoleAuthOptions.persistSession, false);
  assert.equal(serviceRoleAuthOptions.detectSessionInUrl, false);
});

test("read-only cookie error detection is narrow", () => {
  assert.equal(isReadOnlyCookieMutationError(new Error("Cookies can only be modified in a Server Action or Route Handler")), true);
  assert.equal(isReadOnlyCookieMutationError(new Error("different cookie failure")), false);
});
