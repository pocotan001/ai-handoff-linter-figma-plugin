import type {
	DevStatusType,
	LintReadiness,
	LintStatus,
	LintTargetState,
} from "../core/types";

export type StoredLintState = {
	lastLintedAt: string;
	activeIssueCount: number;
	lintStatus: LintStatus;
	stale?: boolean;
};

export function getLintReadiness(
	storedState: StoredLintState | null,
): LintReadiness {
	if (!storedState) {
		return "lint-required";
	}
	if (storedState.stale) {
		return "stale";
	}
	return storedState.activeIssueCount > 0 ? "needs-fixes" : "ai-handoff-ready";
}

export function toLintTargetState(
	storedState: StoredLintState | null,
	devStatus: DevStatusType | null = null,
): LintTargetState {
	return {
		readiness: getLintReadiness(storedState),
		...(storedState
			? {
					lastLintedAt: storedState.lastLintedAt,
					activeIssueCount: storedState.activeIssueCount,
				}
			: {}),
		devStatus,
	};
}

export function shouldWarnReadyForDev(
	state: Pick<LintTargetState, "readiness" | "devStatus">,
): boolean {
	return (
		state.devStatus === "READY_FOR_DEV" &&
		state.readiness !== "ai-handoff-ready"
	);
}
