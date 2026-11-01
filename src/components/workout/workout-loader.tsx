"use client";

import dynamic from "next/dynamic";
import type { ExerciseSummary } from "@/lib/exercises/types";
import type { WorkoutData } from "@/lib/workout/types";
import { WorkoutSkeleton } from "./workout-skeleton";

// The workout screen renders on the client only: it starts from unsaved work kept on the
// device (localStorage) when there is any, which the server can't see.
const WorkoutScreen = dynamic(() => import("./workout-screen").then((module) => module.WorkoutScreen), {
  ssr: false,
  loading: () => <WorkoutSkeleton />,
});

export function WorkoutLoader({ workout, library }: { workout: WorkoutData; library: ExerciseSummary[] }) {
  return <WorkoutScreen workout={workout} library={library} />;
}
