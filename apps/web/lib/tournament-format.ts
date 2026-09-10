// The stage plan for each structural format (A-5), and the enum mapping
// between @beermacs/shared's lowercase-snake TournamentFormatKind and
// Prisma's UPPER_SNAKE one. Shared between tournament creation and format
// change (A-6) — both have to build the same stages for a given format.

import type { TournamentFormatKind as DomainFormatKind } from "@beermacs/shared";
import type { StageType, TournamentFormatKind as PrismaFormatKind } from "@beermacs/db";

export const FORMAT_TO_PRISMA: Record<DomainFormatKind, PrismaFormatKind> = {
  single_elimination: "SINGLE_ELIMINATION",
  group_then_knockout: "GROUP_THEN_KNOCKOUT",
  triangular: "TRIANGULAR",
};

/** Group-then-knockout's top-N-per-group cutoff. Not yet admin-configurable —
 *  a reasonable default until stage management gets its own screen. */
const DEFAULT_ADVANCE_COUNT = 2;

export interface StagePlan {
  readonly type: StageType;
  readonly order: number;
  readonly advanceCount: number | null;
}

/**
 * One stage for single elimination or triangular, two for group-then-
 * knockout (GROUP then ELIMINATION, in that order).
 */
export function stagesFor(format: DomainFormatKind): readonly StagePlan[] {
  if (format === "group_then_knockout") {
    return [
      { type: "GROUP", order: 0, advanceCount: DEFAULT_ADVANCE_COUNT },
      { type: "ELIMINATION", order: 1, advanceCount: null },
    ];
  }
  return [
    { type: format === "triangular" ? "GROUP" : "ELIMINATION", order: 0, advanceCount: null },
  ];
}
