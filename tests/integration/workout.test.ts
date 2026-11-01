// Stage 3 acceptance at the database level, as real signed-in users: a full workout from a
// plan, previous performance in the next workout, an alternative with its own history, the
// plan's weight following the lifted weight, and isolation between users. The writes mirror
// what the workout Server Actions send (all sets of an exercise in one call).
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { groupPreviousPerformance } from "@/lib/workout/previous";
import { builtIn, runId, signUp, type Client } from "./helpers";

const SQUAT = builtIn(40);
const LEG_PRESS = builtIn(42);
const SMITH_SQUAT = builtIn(53);
const PLAN_WEIGHT = 50;
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

type SetsArgs = { weight: number | null; reps: number | null; done: boolean };

// One exercise's sets in one call: the same values for every id, in order.
async function saveSets(client: Client, sessionExerciseId: string, setIds: string[], { weight, reps, done }: SetsArgs) {
  return client.rpc("save_session_exercise_sets", {
    p_session_exercise_id: sessionExerciseId,
    p_set_ids: setIds,
    p_weight_kg: weight as number,
    p_reps: reps as number,
    p_is_done: done,
  });
}

async function planWeight(client: Client, templateExerciseId: string) {
  const { data, error } = await client.from("template_exercises").select("target_weight_kg").eq("id", templateExerciseId).single();
  if (error) throw error;
  return data.target_weight_kg == null ? null : Number(data.target_weight_kg);
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
  let squatTe: string;
  let legPressTe: string;
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
        {
          template_id: templateId,
          exercise_id: SQUAT,
          position: 1,
          planned_sets: 3,
          rep_range_min: 8,
          rep_range_max: 12,
          target_weight_kg: PLAN_WEIGHT,
        },
        { template_id: templateId, exercise_id: LEG_PRESS, position: 2, planned_sets: 2 },
      ])
      .select("id, position");
    if (exercises.error) throw exercises.error;
    squatTe = exercises.data.find((row) => row.position === 1)!.id;
    legPressTe = exercises.data.find((row) => row.position === 2)!.id;
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

    // All sets of the exercise are written in one call, with one weight and reps. A fourth
    // set gets a client-generated id; replaying the call (after a reload) changes nothing.
    const squatSetIds = [...squat.session_sets.map((set) => set.id), randomUUID()];
    for (let i = 0; i < 2; i++) {
      const saved = await saveSets(alice, squat.id, squatSetIds, { weight: 62.5, reps: 6, done: true });
      expect(saved.error).toBeNull();
    }
    // Dropping a set: ids missing from the list are deleted.
    const legPressSaved = await saveSets(alice, legPress.id, [legPress.session_sets[0].id], { weight: 100, reps: 10, done: true });
    expect(legPressSaved.error).toBeNull();
    await alice.from("session_exercises").update({ note: "עמידה רחבה" }).eq("id", squat.id);

    const mid = await cardsOf(alice, first);
    expect(mid[0].session_sets).toHaveLength(4);
    expect(mid[1].session_sets).toHaveLength(1);

    // A card added during the workout, with a client-generated id.
    const addedId = randomUUID();
    const added = await alice
      .from("session_exercises")
      .insert({ id: addedId, session_id: first, exercise_id: LEG_EXTENSION, position: 3 });
    expect(added.error).toBeNull();
    expect((await saveSets(alice, addedId, [randomUUID()], { weight: null, reps: null, done: false })).error).toBeNull();

    const reorder = await alice.rpc("reorder_session_exercises", { p_session_id: first, p_ids: [squat.id, addedId, legPress.id] });
    expect(reorder.error).toBeNull();

    const completed = await alice.rpc("complete_session", { p_session_id: first });
    expect(completed.data).toBe(true);

    const saved = await cardsOf(alice, first);
    // The added card had no done set, so it's gone.
    expect(saved.map((c) => c.exercise_id)).toEqual([SQUAT, LEG_PRESS]);
    expect(saved[0].session_sets.map((s) => [s.set_number, Number(s.weight_kg), s.reps, s.is_done])).toEqual([
      [1, 62.5, 6, true],
      [2, 62.5, 6, true],
      [3, 62.5, 6, true],
      [4, 62.5, 6, true],
    ]);
  });

  it("updates the plan's weight to the lifted weight on completing", async () => {
    expect(await planWeight(alice, squatTe)).toBe(62.5);
    // Leg press had no plan weight; the lifted weight becomes it.
    expect(await planWeight(alice, legPressTe)).toBe(100);
  });

  it("shows the first workout as previous performance in the second", async () => {
    const started = await start(alice, templateId, "2026-11-03");
    expect(started.error).toBeNull();
    second = started.data!;

    const previous = await previousOf(alice, [SQUAT, LEG_PRESS], second);
    const squat = previous.get(SQUAT)!;
    expect(squat.sessionId).toBe(first);
    expect(squat.note).toBe("עמידה רחבה");
    expect(squat.sets).toEqual([1, 2, 3, 4].map((set_number) => ({ set_number, weight_kg: 62.5, reps: 6 })));
    expect(previous.get(LEG_PRESS)?.sets).toEqual([{ set_number: 1, weight_kg: 100, reps: 10 }]);
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

    const lifted = await saveSets(alice, squatCard.id, [squatCard.session_sets[0].id], { weight: 40, reps: 12, done: true });
    expect(lifted.error).toBeNull();
    expect((await alice.rpc("complete_session", { p_session_id: second })).data).toBe(true);

    const previous = await previousOf(alice, [SQUAT, SMITH_SQUAT]);
    expect(previous.get(SMITH_SQUAT)).toMatchObject({ sessionId: second, sets: [{ set_number: 1, weight_kg: 40, reps: 12 }] });
    expect(previous.get(SQUAT)?.sessionId).toBe(first);

    const [saved] = await cardsOf(alice, second);
    expect(saved).toMatchObject({ exercise_id: SMITH_SQUAT, replaced_exercise_id: SQUAT });
  });

  it("leaves the plan's weight alone for a swapped exercise", async () => {
    expect(await planWeight(alice, squatTe)).toBe(62.5);
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
    const save = await saveSets(bob, aliceCard.id, [aliceSet.id], { weight: 1, reps: 99, done: true });
    expect(save.error?.code).toBe("P0002");
    const card = await bob.from("session_exercises").insert({ session_id: first, exercise_id: SQUAT, position: 9 });
    expect(card.error?.code).toBe("42501");

    expect((await bob.rpc("delete_session_set", { p_set_id: aliceSet.id })).error?.code).toBe("P0002");
    expect((await bob.rpc("complete_session", { p_session_id: first })).error?.code).toBe("P0002");
    expect((await start(bob, templateId)).error?.code).toBe("P0002");

    const deleted = await bob.from("workout_sessions").delete().eq("id", first).select("id");
    expect(deleted.data).toEqual([]);
    const { data: still } = await alice.from("session_sets").select("reps").eq("id", aliceSet.id).single();
    expect(still?.reps).toBe(6);
  });
});
