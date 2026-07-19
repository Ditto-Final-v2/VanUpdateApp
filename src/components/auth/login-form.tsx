"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/login/actions";

const initialState: LoginState = { message: "" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="mt-7 space-y-5">
      <div>
        <label className="form-label" htmlFor="admin-email">Email address</label>
        <input className="form-input" id="admin-email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <label className="form-label" htmlFor="admin-password">Password</label>
        <input className="form-input" id="admin-password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state.message && <p role="alert" className="border border-red-800 bg-red-50 p-3 text-sm font-bold text-red-900">{state.message}</p>}
      <button className="button-primary w-full" type="submit" disabled={pending}>{pending ? "Signing in…" : "Enter admin"}</button>
    </form>
  );
}
