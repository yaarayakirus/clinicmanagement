"use client";

import { signIn, signOut } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      className="button button--primary"
      type="button"
      onClick={() => void signIn("google")}
    >
      Sign in with Google
    </button>
  );
}

export function SignOutButton() {
  return (
    <button className="button" type="button" onClick={() => void signOut()}>
      Sign out
    </button>
  );
}
