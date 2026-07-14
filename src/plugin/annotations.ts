import type { LintReadiness, LintTargetState } from "../core/types";
import { shouldWarnReadyForDev } from "./lint-state";

export const AI_HANDOFF_LINTER_ANNOTATION_PREFIX = "AI Handoff Linter:";

type AiHandoffAnnotation = Pick<
	Annotation,
	"categoryId" | "label" | "labelMarkdown" | "properties"
>;

export function syncAiHandoffLinterAnnotations(
	annotations: readonly AiHandoffAnnotation[],
	state: Pick<LintTargetState, "devStatus" | "readiness">,
): AiHandoffAnnotation[] {
	const existing = annotations.filter(
		(annotation) => !isAiHandoffLinterAnnotation(annotation),
	);
	if (state.readiness === "ai-handoff-ready") {
		return [...existing, createAiHandoffLinterAnnotation(state.readiness)];
	}

	if (!shouldWarnReadyForDev(state)) {
		return existing;
	}

	return [...existing, createAiHandoffLinterAnnotation(state.readiness)];
}

export function areAnnotationsEqual(
	currentAnnotations: readonly AiHandoffAnnotation[],
	nextAnnotations: readonly AiHandoffAnnotation[],
): boolean {
	if (currentAnnotations.length !== nextAnnotations.length) {
		return false;
	}

	return currentAnnotations.every((annotation, index) => {
		const nextAnnotation = nextAnnotations[index];
		if (!nextAnnotation) {
			return false;
		}

		return (
			annotation.label === nextAnnotation.label &&
			annotation.labelMarkdown === nextAnnotation.labelMarkdown &&
			annotation.categoryId === nextAnnotation.categoryId &&
			JSON.stringify(annotation.properties ?? []) ===
				JSON.stringify(nextAnnotation.properties ?? [])
		);
	});
}

function isAiHandoffLinterAnnotation(
	annotation: Pick<Annotation, "label" | "labelMarkdown">,
): boolean {
	return (
		startsWithPluginPrefix(annotation.label) ||
		startsWithPluginPrefix(annotation.labelMarkdown)
	);
}

function createAiHandoffLinterAnnotation(
	readiness: LintReadiness,
): AiHandoffAnnotation {
	return {
		labelMarkdown: `${AI_HANDOFF_LINTER_ANNOTATION_PREFIX} ${getReadinessMessage(readiness)}`,
	};
}

function startsWithPluginPrefix(value: string | undefined): boolean {
	return value?.startsWith(AI_HANDOFF_LINTER_ANNOTATION_PREFIX) === true;
}

function getReadinessMessage(readiness: LintReadiness): string {
	if (readiness === "ai-handoff-ready") {
		return "AI Handoff Ready. Lint passed with no active issues.";
	}
	if (readiness === "lint-required") {
		return "This design is marked Ready for Dev, but lint has not been run.";
	}
	if (readiness === "stale") {
		return "This design is marked Ready for Dev, but the lint result is stale.";
	}
	return "This design is marked Ready for Dev, but lint has active issues.";
}
