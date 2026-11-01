// Stage 3 acceptance at the database level, as real signed-in users: a full workout from a
// plan, previous performance in the next workout, an alternative with its own history, and
// isolation between users. The writes mirror what the workout Server Actions send.
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { suggestionForSet } from "@/lib/calc";
import { groupPreviousPerformance } from "@/lib/workout/previous";
import { builtIn, runId, signUp, type Client } from "./helpers";

const SQUAT = builtIn(40);
const LEG_PRESS = builtIn(42);
const SMITH_SQUAT = builtIn(53);
const LEG_EXTENSION = builtIn(44);

async function start(client: Client, templateId: string | null, date = "2026-11-01") {
  // The generated types mark p_template_id as non-null; null starts a free workout.
  return client.rpc("start_session", { p_template_id: templateId as string, p_session_date: date });
}

async function cardsOf(client: Client, sessionId: string) {
  const { data, error } = await client
    .from("session_exercises")
    .select("id, exercise_id, replaced_exercise_id, position, note, session_sets(id, set_number, weight_kg, reps, is_done)")
    .eq("session_id", sessionId)
    .order("position");
  if (error) throw error;
  return data.map((card) => ({ ...card, session_sets: card.session_sets.sort((a, b) => a.set_number - b.set_number) }));
}

async function previousOf(client: Client, exerciseIds: string[], exclude?: string) {
  const { data, error } = await client.rpc("previous_performance", {
    p_exercise_ids: exerciseIds,
    p_exclude_session_id: exclude,
  });
  if (error) throw error;
  return groupPreviousPerformance(data);
}

describe("active workout", () => {
  let alice: Client;
  let aliceId: string;
  let bob: Client;
  let templateId: string;
  let first: string;
  let second: string;

  beforeAll(async () => {
    ({ client: alice, userId: aliceId } = await signUp(`wo_alice_${runId}`));
    ({ client: bob } = await signUp(`wo_bob_${runId}`));

    const template = await alice
      .from("workout_templates")
      .insert({ user_id: aliceId, name: "רגליים" })
      .select("id")
      .single();
    if (template.error) throw template.error;
    templateId = template.data.id;

    const exercises = await alice
      .from("template_exercises")
      .insert([
        { template_id: templateId, exercise_id: SQUAT, position: 1, planned_sets: 3, rep_range_min: 8, rep_range_max: 12 },
        { template_id: templateId, exercise_id: LEG_PRESS, position: 2, planned_sets: 2 },
      ])
      .select("id, position");
    if (exercises.error) throw exercises.error;
    const squatTe = exercises.data.find((row) => row.position === 1)!.id;
    const alt = await alice
      .from("template_exercise_alternatives")
      .insert({ template_exercise_id: squatTe, exercise_id: SMITH_SQUAT, position: 1 });
    if (alt.error) throw alt.error;
  });

  it("runs a first workout from the plan and saves it", async () => {
    const started = await start(alice, templateId);
    expect(started.error).toBeNull();
    first = started.data!;

    const cards = await cardsOf(alice, first);
    expect(cards.map((c) => [c.exercise_id, c.session_sets.length])).toEqual([
      [SQUAT, 3],
      [LEG_PRESS, 2],
    ]);
    const [squat, legPress] = cards;

    // Sets are written as upserts by id (the client generates ids for new sets).
    const extraSetId = randomUUID();
    const squatSets = [
      { id: squat.session_sets[0].id, set_number: 1, weight_kg: 60, reps: 8, is_done: true },
      { id: squat.session_sets[1].id, set_number: 2, weight_kg: 62.5, reps: 6, is_done: true },
      { id: squat.session_sets[2].id, set_number: 3, weight_kg: 65, reps: 3, is_done: false },
      { id: extraSetId, set_number: 4, weight_kg: 50, reps: 10, is_done: true },
    ].map((set) => ({ ...set, session_exercise_id: squat.id }));
    for (let i = 0; i < 2; i++) {
      // Replaying the same ops (after a reload) changes nothing.
      const upsert = await alice.from("session_sets").upsert(squatSets, { onConflict: "id" });
      expect(upsert.error).toBeNull();
    }
    await alice
      .from("session_sets")
      .upsert({ id: legPress.session_sets[0].id, session_exercise_id: legPress.id, set_number: 1, weight_kg: 100, reps: 10, is_done: true });
    await alice.from("session_exercises").update({ note: "עמידה רחבה" }).eq("id", squat.id);

    // "Remove set" drops the last set.
    const removed = await alice.rpc("delete_session_set", { p_set_id: legPress.session_sets[1].id });
    expect(removed.error).toBeNull();

    // A card added during the workout, with a client-generated id.
    const addedId = randomUUID();
    const added = await alice
      .from("session_exercises")
      .insert({ id: addedId, session_id: first, exercise_id: LEG_EXTENSION, position: 3 });
    expect(added.error).toBeNull();
    await alice.from("session_sets").insert({ id: randomUUID(), session_exercise_id: addedId, set_number: 1 });

    const reorder = await alice.rpc("reorder_session_exercises", { p_session_id: first, p_ids: [squat.id, addedId, legPress.id] });
    expect(reorder.error).toBeNull();

    const completed = await alice.rpc("complete_session", { p_session_id: first });
    expect(completed.data).toBe(true);

    const saved = await cardsOf(alice, first);
    // The added card had no done set, so it's gone; undone set 3 is gone and set 4 became 3.
    expect(saved.map((c) => c.exercise_id)).toEqual([SQUAT, LEG_PRESS]);
    expect(saved[0].session_sets.map((s) => [s.set_number, Number(s.weight_kg), s.reps])).toEqual([
      [1, 60, 8],
      [2, 62.5, 6],
      [3, 50, 10],
    ]);
  });

  it("shows the first workout as previous performance in the second", async () => {
    const started = await start(alice, templateId, "2026-11-03");
    expect(started.error).toBeNull();
    second = started.data!;

    const previous = await previousOf(alice, [SQUAT, LEG_PRESS], second);
    const squat = previous.get(SQUAT)!;
    expect(squat.sessionId).toBe(first);
    expect(squat.note).toBe("עמידה רחבה");
    expect(squat.sets).toEqual([
      { set_number: 1, weight_kg: 60, reps: 8 },
      { set_number: 2, weight_kg: 62.5, reps: 6 },
      { set_number: 3, weight_kg: 50, reps: 10 },
    ]);
    expect(previous.get(LEG_PRESS)?.sets).toEqual([{ set_number: 1, weight_kg: 100, reps: 10 }]);

    // Prefill matches by set number; leg press set 2 has no counterpart.
    expect(suggestionForSet(squat, 2)).toEqual({ weight_kg: 62.5, reps: 6 });
    expect(suggestionForSet(previous.get(LEG_PRESS)!, 2)).toBeNull();
  });

  it("doesn't start another workout while one is open", async () => {
    const again = await start(alice, null);
    expect(again.error?.code).toBe("23505");
  });

  it("gives an alternative its own history and leaves the original's alone", async () => {
    const [squatCard] = await cardsOf(alice, second);
    const swap = await alice
      .from("session_exercises")
      .update({ exercise_id: SMITH_SQUAT, replaced_exercise_id: SQUAT })
      .eq("id", squatCard.id)
      .select("id");
    expect(swap.data).toHaveLength(1);

    // No history for the alternative yet.
    expect((await previousOf(alice, [SMITH_SQUAT], second)).size).toBe(0);

    await alice.from("session_sets").upsert({
      id: squatCard.session_sets[0].id,
      session_exercise_id: squatCard.id,
      set_number: 1,
      weight_kg: 40,
      reps: 12,
      is_done: true,
    });
    expect((await alice.rpc("complete_session", { p_session_id: second })).data).toBe(true);

    const previous = await previousOf(alice, [SQUAT, SMITH_SQUAT]);
    expect(previous.get(SMITH_SQUAT)).toMatchObject({ sessionId: second, sets: [{ set_number: 1, weight_kg: 40, reps: 12 }] });
    expect(previous.get(SQUAT)?.sessionId).toBe(first);

    const [saved] = await cardsOf(alice, second);
    expect(saved).toMatchObject({ exercise_id: SMITH_SQUAT, replaced_exercise_id: SQUAT });
  });

  it("doesn't save a workout with no done set", async () => {
    const started = await start(alice, null);
    expect(started.error).toBeNull();
    const result = await alice.rpc("complete_session", { p_session_id: started.data! });
    expect(result.data).toBe(false);
    const { data } = await alice.from("workout_sessions").select("status").eq("id", started.data!).single();
    expect(data?.status).toBe("in_progress");

    const deleted = await alice.from("workout_sessions").delete().eq("id", started.data!).select("id");
    expect(deleted.data).toHaveLength(1);
  });

  it("keeps other users out of the sessions and sets", async () => {
    const [aliceCard] = await cardsOf(alice, first);
    const aliceSet = aliceCard.session_sets[0];

    const sessions = await bob.from("workout_sessions").select("id").eq("id", first);
    expect(sessions.data).toEqual([]);
    const sets = await bob.from("session_sets").select("id").eq("id", aliceSet.id);
    expect(sets.data).toEqual([]);
    expect((await previousOf(bob, [SQUAT, SMITH_SQUAT])).size).toBe(0);

    const update = await bob.from("session_sets").update({ reps: 99 }).eq("id", aliceSet.id).select("id");
    expect(update.data).toEqual([]);
    const upsert = await bob
      .from("session_sets")
      .upsert({ id: randomUUID(), session_exercise_id: aliceCard.id, set_number: 9, reps: 1, is_done: true });
    expect(upsert.error?.code).toBe("42501");
    const card = await bob.from("session_exercises").insert({ session_id: first, exercise_id: SQUAT, position: 9 });
    expect(card.error?.code).toBe("42501");

    expect((await bob.rpc("delete_session_set", { p_set_id: aliceSet.id })).error?.code).toBe("P0002");
    expect((await bob.rpc("complete_session", { p_session_id: first })).error?.code).toBe("P0002");
    expect((await start(bob, templateId)).error?.code).toBe("P0002");

    const deleted = await bob.from("workout_sessions").delete().eq("id", first).select("id");
    expect(deleted.data).toEqual([]);
    const { data: still } = await alice.from("session_sets").select("reps").eq("id", aliceSet.id).single();
    expect(still?.reps).toBe(8);
  });
});
