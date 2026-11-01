// Stage 2 acceptance: a template with 5 exercises, rep ranges and alternatives, reordered,
// plus duplicate/archive and personal-exercise rules, as a real signed-in user.
import { beforeAll, describe, expect, it } from "vitest";
import { builtIn, runId, signUp, type Client } from "./helpers";

describe("templates", () => {
  let alice: Client;
  let aliceId: string;
  let bob: Client;
  let templateId: string;
  let teIds: string[] = [];

  beforeAll(async () => {
    ({ client: alice, userId: aliceId } = await signUp(`tpl_alice_${runId}`));
    ({ client: bob } = await signUp(`tpl_bob_${runId}`));

    const { data, error } = await alice
      .from("workout_templates")
      .insert({ user_id: aliceId, name: "רגליים" })
      .select("id")
      .single();
    if (error) throw error;
    templateId = data.id;
  });

  it("builds a template with 5 exercises, rep ranges and alternatives", async () => {
    // squat, leg press, RDL, leg extension, lying leg curl
    const exercises = [40, 42, 47, 44, 45].map(builtIn);
    const ranges: [number, number][] = [[6, 8], [10, 15], [8, 10], [12, 15], [10, 12]];

    const { data, error } = await alice
      .from("template_exercises")
      .insert(
        exercises.map((exercise_id, i) => ({
          template_id: templateId,
          exercise_id,
          position: i + 1,
          planned_sets: 3 + (i % 2),
          rep_range_min: ranges[i][0],
          rep_range_max: ranges[i][1],
        })),
      )
      .select("id, position");
    if (error) throw error;
    teIds = data.sort((a, b) => a.position - b.position).map((row) => row.id);

    // Squat: smith machine squat and hack squat as alternatives, in priority order.
    const alternatives = await alice.from("template_exercise_alternatives").insert([
      { template_exercise_id: teIds[0], exercise_id: builtIn(53), position: 1 },
      { template_exercise_id: teIds[0], exercise_id: builtIn(43), position: 2 },
    ]);
    expect(alternatives.error).toBeNull();

    const { data: saved } = await alice
      .from("template_exercises")
      .select("rep_range_min, rep_range_max, template_exercise_alternatives(exercise_id)")
      .eq("template_id", templateId)
      .order("position");
    expect(saved).toHaveLength(5);
    expect(saved?.map((r) => [r.rep_range_min, r.rep_range_max])).toEqual(ranges);
    expect(saved?.[0].template_exercise_alternatives).toHaveLength(2);
  });

  it("rejects an invalid rep range", async () => {
    const { error } = await alice
      .from("template_exercises")
      .update({ rep_range_min: 12, rep_range_max: 8 })
      .eq("id", teIds[1]);
    expect(error?.code).toBe("23514");
  });

  it("reorders exercises and alternatives", async () => {
    const newOrder = [teIds[4], teIds[0], teIds[1], teIds[2], teIds[3]];
    const { error } = await alice.rpc("reorder_template_exercises", {
      p_template_id: templateId,
      p_ids: newOrder,
    });
    expect(error).toBeNull();

    const { data } = await alice
      .from("template_exercises")
      .select("id")
      .eq("template_id", templateId)
      .order("position");
    expect(data?.map((r) => r.id)).toEqual(newOrder);

    const alts = await alice
      .from("template_exercise_alternatives")
      .select("id, exercise_id")
      .eq("template_exercise_id", teIds[0])
      .order("position");
    const reversed = [...(alts.data ?? [])].reverse();
    await alice.rpc("reorder_template_alternatives", {
      p_template_exercise_id: teIds[0],
      p_ids: reversed.map((a) => a.id),
    });
    const after = await alice
      .from("template_exercise_alternatives")
      .select("exercise_id")
      .eq("template_exercise_id", teIds[0])
      .order("position");
    expect(after.data?.map((a) => a.exercise_id)).toEqual([builtIn(43), builtIn(53)]);
  });

  it("duplicates a template with its exercises and alternatives", async () => {
    const { data: copyId, error } = await alice.rpc("duplicate_template", {
      p_template_id: templateId,
      p_name: "רגליים (עותק)",
    });
    expect(error).toBeNull();

    const { data } = await alice
      .from("template_exercises")
      .select("exercise_id, template_exercise_alternatives(exercise_id)")
      .eq("template_id", copyId!)
      .order("position");
    expect(data).toHaveLength(5);
    expect(data?.flatMap((r) => r.template_exercise_alternatives)).toHaveLength(2);
  });

  it("keeps other users out", async () => {
    const reorder = await bob.rpc("reorder_template_exercises", {
      p_template_id: templateId,
      p_ids: teIds,
    });
    expect(reorder.error).not.toBeNull();

    const duplicate = await bob.rpc("duplicate_template", { p_template_id: templateId, p_name: "x" });
    expect(duplicate.error).not.toBeNull();

    const archive = await bob.rpc("archive_template", { p_template_id: templateId });
    expect(archive.error).not.toBeNull();
  });

  it("archives and restores a template", async () => {
    const { data: removed, error } = await alice.rpc("archive_template", { p_template_id: templateId });
    expect(error).toBeNull();
    expect(removed).toBe(0);

    await alice.from("workout_templates").update({ is_archived: false }).eq("id", templateId);
    const { data } = await alice.from("workout_templates").select("is_archived").eq("id", templateId).single();
    expect(data?.is_archived).toBe(false);
  });
});

describe("personal exercises", () => {
  let alice: Client;
  let aliceId: string;

  beforeAll(async () => {
    ({ client: alice, userId: aliceId } = await signUp(`ex_alice_${runId}`));
  });

  it("can be deleted while unused, and only archived once used", async () => {
    const insert = (name: string) =>
      alice
        .from("exercises")
        .insert({ user_id: aliceId, name_he: name, muscle_group: "core", equipment: "other" })
        .select("id")
        .single();

    const unused = await insert("תרגיל שלא בשימוש");
    expect((await alice.rpc("exercise_in_use", { p_exercise_id: unused.data!.id })).data).toBe(false);
    const deleted = await alice.from("exercises").delete().eq("id", unused.data!.id).select("id");
    expect(deleted.data).toHaveLength(1);

    const used = await insert("תרגיל בשימוש");
    const template = await alice
      .from("workout_templates")
      .insert({ user_id: aliceId, name: "בטן" })
      .select("id")
      .single();
    await alice
      .from("template_exercises")
      .insert({ template_id: template.data!.id, exercise_id: used.data!.id, position: 1 });

    expect((await alice.rpc("exercise_in_use", { p_exercise_id: used.data!.id })).data).toBe(true);
    const blocked = await alice.from("exercises").delete().eq("id", used.data!.id);
    expect(blocked.error?.code).toBe("23503");

    const archived = await alice.from("exercises").update({ is_archived: true }).eq("id", used.data!.id).select("id");
    expect(archived.data).toHaveLength(1);
  });

  it("built-in exercises cannot be edited or deleted", async () => {
    const update = await alice.from("exercises").update({ name_he: "x" }).eq("id", builtIn(1)).select("id");
    expect(update.data).toEqual([]);
    const del = await alice.from("exercises").delete().eq("id", builtIn(1)).select("id");
    expect(del.data).toEqual([]);
  });
});
