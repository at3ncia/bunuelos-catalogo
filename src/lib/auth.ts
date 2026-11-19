// Sesión del único administrador (Supabase Auth). El registro público está
// desactivado en Supabase y las políticas RLS exigen public.is_admin().
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export function useAdminSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  return { session, checking };
}

export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) return "Correo o contraseña incorrectos";
  const { data, error: e2 } = await supabase.rpc("is_admin");
  if (e2 || !data) {
    await supabase.auth.signOut();
    return "Este usuario no es el administrador del negocio";
  }
  return null;
}

export const signOut = () => supabase.auth.signOut();
