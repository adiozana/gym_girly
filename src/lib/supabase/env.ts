import { z } from "zod";

const supabaseEnvSchema = z.object({
  url: z.url(),
  publishableKey: z.string().min(1),
});

export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;

// NEXT_PUBLIC_* vars must be referenced literally so Next.js can inline them in the client bundle.
export function getSupabaseEnv(
  source: Record<string, string | undefined> = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
): SupabaseEnv {
  const parsed = supabaseEnvSchema.safeParse({
    url: source.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!parsed.success) {
    throw new Error(
      "Missing or invalid Supabase env vars: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example).",
    );
  }
  return parsed.data;
}
