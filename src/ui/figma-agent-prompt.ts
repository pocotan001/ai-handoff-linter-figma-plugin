import type { LintIssue } from "../core/types";
import { formatSeverity, type Messages, translateIssueCopy } from "./i18n";

export function createFigmaAgentPrompt({
	issues,
	targetName,
	t,
}: {
	issues: LintIssue[];
	targetName: string;
	t: Messages;
}): string {
	const items = issues
		.filter((issue) => issue.severity !== "review")
		.map((issue) => {
			const copy = translateIssueCopy(issue, t);
			return `- [${formatSeverity(issue.severity, t)}] ${issue.nodeName}\n  ${copy.message}\n  ${t.agentRecommendation}: ${copy.recommendation}`;
		})
		.join("\n");

	return `${t.agentPromptIntro(targetName)}

${t.agentPromptGuardrails}

${t.agentPromptIssues}
${items}

${t.agentPromptFinish}`;
}
