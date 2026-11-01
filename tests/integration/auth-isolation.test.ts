// Signs up real users through Supabase Auth and checks that RLS isolates them.
import { beforeAll, describe, expect, it } from "vitest";
import { usernameToEmail } from "@/lib/auth/form-state";
import { newClient, PASSWORD, runId, signUp, type Client } from "./helpers";

describe("sign-up and per-user isolation", () => {
  const aliceName = `alice_${runId}`;
  const bobName = `bob_${runId}`;
  let alice: Client;
  let bob: Client;
  let aliceTemplateId: string;

  beforeAll(async () => {
    const signedUpAlice = await signUp(aliceName);
    alice = signedUpAlice.client;
    bob = (await signUp(bobName)).client;

    const { data, error } = await alice
      .from("workout_templates")
      .insert({ user_id: signedUpAlice.userId, name: "Legs" })
      .select("id")
      .single();
    if (error) throw error;
    aliceTemplateId = data.id;
  });

  it("creates a profile with the chosen username", async () => {
    const { data } = await alice.from("profiles").select("username");
    expect(data).toEqual([{ username: aliceName }]);
  });

  it("rejects a username that is already taken", async () => {
    const { error } = await newClient().auth.signUp({
      email: usernameToEmail(aliceName),
      password: PASSWORD,
      options: { data: { username: aliceName } },
    });
    expect(error?.code).toBe("user_already_exists");
  });

  it("signs in with the right password and rejects a wrong one", async () => {
    const ok = await newClient().auth.signInWithPassword({
      email: usernameToEmail(aliceName),
      password: PASSWORD,
    });
    expect(ok.error).toBeNull();

    const bad = await newClient().auth.signInWithPassword({
      email: usernameToEmail(aliceName),
      password: "wrong-password",
    });
    expect(bad.error?.code).toBe("invalid_credentials");
  });

  it("shows each user only their own data", async () => {
    const own = await alice.from("workout_templates").select("id");
    expect(own.data).toEqual([{ id: aliceTemplateId }]);

    const other = await bob.from("workout_templates").select("id");
    expect(other.data).toEqual([]);

    const profiles = await bob.from("profiles").select("username");
    expect(profiles.data).toEqual([{ username: bobName }]);
  });

  it("does not let one user write into another user's data", async () => {
    const { error } = await bob.from("template_exercises").insert({
      template_id: aliceTemplateId,
      exercise_id: "00000000-0000-4000-8000-000000000001",
      position: 1,
    });
    expect(error?.code).toBe("42501");

    const rename = await bob
      .from("workout_templates")
      .update({ name: "hacked" })
      .eq("id", aliceTemplateId)
      .select("id");
    expect(rename.data).toEqual([]);
  });
});
