export type LintSeverity = "error" | "warning" | "review";

export type LintStatus =
	| "needs-design-fix"
	| "needs-improvement"
	| "ai-handoff-ready"
	| "ai-handoff-ready-with-ignored-issues";

export type LintReadiness =
	| "lint-required"
	| "stale"
	| "needs-fixes"
	| "ai-handoff-ready";

export type DevStatusType = "READY_FOR_DEV" | "COMPLETED";

export type LintTargetState = {
	readiness: LintReadiness;
	lastLintedAt?: string;
	activeIssueCount?: number;
	devStatus?: DevStatusType | null;
};

export type DesignTokenSource =
	| "figma-variable"
	| "figma-style"
	| "imported-token";

export type DesignTokenType =
	| "color"
	| "number"
	| "string"
	| "boolean"
	| "paintStyle"
	| "textStyle"
	| "effectStyle"
	| "gridStyle";

export type DesignTokenAlias = {
	type: "alias";
	id: string;
};

export type DesignTokenValue =
	| string
	| number
	| boolean
	| DesignTokenAlias
	| Record<string, unknown>
	| ReadonlyArray<unknown>;

export type DesignToken = {
	name: string;
	path: string[];
	type: DesignTokenType;
	value: DesignTokenValue;
	modes?: Record<string, DesignTokenValue>;
	source: DesignTokenSource;
	figma?: {
		id: string;
		key?: string;
		collectionId?: string;
		collectionKey?: string;
		collectionName?: string;
	};
};

export type TokenReference = {
	id: string;
	name: string;
	type: DesignTokenType;
	source: DesignTokenSource;
};

export type LintableNode = {
	id: string;
	name: string;
	type: string;
	layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL" | "GRID";
	layoutPositioning?: "AUTO" | "ABSOLUTE";
	primaryAxisSizingMode?: "FIXED" | "AUTO";
	children?: LintableNode[];
	hasRawVisualValue?: boolean;
	hasTextStyle?: boolean;
	hasImageFill?: boolean;
	hasDescription?: boolean;
	autoRename?: boolean;
	textContent?: string;
	visible?: boolean;
	tokenReferences?: TokenReference[];
};

export type LintWaiver = {
	ruleId: string;
	nodeId: string;
	reason: string;
	createdAt: string;
};

export type LintIssue = {
	id: string;
	ruleId: string;
	severity: LintSeverity;
	nodeId: string;
	nodeName: string;
	message: string;
	recommendation: string;
	evidence?: string;
	waiver?: LintWaiver;
};

export type LintResult = {
	rootNodeId: string;
	rootNodeName: string;
	issues: LintIssue[];
};

export type LintSummary = Record<LintSeverity, number>;

export type PluginToUiMessage =
	| {
			type: "lint-result";
			result: LintResult;
			status: LintStatus;
			summary: LintSummary;
			waivers: LintWaiver[];
			targetState: LintTargetState;
	  }
	| {
			type: "ignore-saved";
			waiver: LintWaiver;
	  }
	| {
			type: "ignore-removed";
			ruleId: string;
			nodeId: string;
	  }
	| {
			type: "pick-state";
			picking: boolean;
	  }
	| {
			type: "lint-error";
			message: string;
	  }
	| {
			type: "settings-loaded";
			language: "auto" | "en" | "ja";
			disabledRules: string[];
	  };

export type UiToPluginMessage =
	| {
			type: "ui-ready";
	  }
	| {
			type: "select-node";
			nodeId: string;
	  }
	| {
			type: "ignore-issue";
			ruleId: string;
			nodeId: string;
			reason: string;
	  }
	| {
			type: "remove-ignore";
			ruleId: string;
			nodeId: string;
	  }
	| {
			type: "start-pick-target";
	  }
	| {
			type: "cancel-pick-target";
	  }
	| {
			type: "resize-window";
			width: number;
			height: number;
	  }
	| {
			type: "save-settings";
			language: "auto" | "en" | "ja";
			disabledRules: string[];
	  };
