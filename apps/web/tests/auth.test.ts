import assert from "node:assert/strict";
import test from "node:test";
import { canAccessAdminRoutes, getPostSignInPath } from "../src/features/auth/authCore.ts";

test("blocks guests and students from admin routes", () => {
  assert.equal(canAccessAdminRoutes([]), false);
  assert.equal(canAccessAdminRoutes(["student"]), false);
});

test("allows researcher and admin roles to access admin routes", () => {
  assert.equal(canAccessAdminRoutes(["researcher"]), true);
  assert.equal(canAccessAdminRoutes(["admin"]), true);
});

test("redirects admin users to admin after sign-in", () => {
  assert.equal(getPostSignInPath(["admin"]), "/admin");
  assert.equal(getPostSignInPath(["researcher"]), "/admin");
});

test("uses dashboard fallback for non-admin users after sign-in", () => {
  assert.equal(getPostSignInPath(["student"]), "/dashboard");
});
