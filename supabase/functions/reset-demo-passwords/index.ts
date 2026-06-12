// One-off: align demo customer auth users and reset demo passwords to Yieldbase2026!
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const password = "Yieldbase2026!";
  const customerMappings = [
    { from: "kunde-a@yieldbase.example.com", profile: "kunde1@example.com", to: "kunde1@yieldbase.example.com" },
    { from: "kunde-b@yieldbase.example.com", profile: "kunde2@example.com", to: "kunde2@yieldbase.example.com" },
    { from: "kunde-c@yieldbase.example.com", profile: "kunde3@example.com", to: "kunde3@yieldbase.example.com" },
  ];
  const results: Array<{ email: string; ok: boolean; action: string; error?: string }> = [];
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
  for (const mapping of customerMappings) {
    const user = list?.users.find((u) => u.email === mapping.from || u.email === mapping.to);
    if (!user) {
      results.push({ email: mapping.to, ok: false, action: "customer-map", error: "Auth user missing" });
      continue;
    }
    const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
      email: mapping.to,
      password,
      email_confirm: true,
    });
    const { error: profileError } = await admin
      .from("profiles")
      .update({ email: mapping.to })
      .eq("id", user.id);
    results.push({
      email: mapping.to,
      ok: !authError && !profileError,
      action: "customer-map",
      error: authError?.message ?? profileError?.message,
    });
  }
  for (const u of list?.users ?? []) {
    if (!u.email?.endsWith("@yieldbase.example.com")) continue;
    const { error } = await admin.auth.admin.updateUserById(u.id, {
      password,
      email_confirm: true,
    });
    results.push({ email: u.email, ok: !error, action: "password-reset", error: error?.message });
  }
  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...cors, "content-type": "application/json" },
  });
});
