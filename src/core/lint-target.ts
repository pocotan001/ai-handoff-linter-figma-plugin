/** Node types the plugin accepts as a lint root. */
export function isLintTargetType(type: string): boolean {
	return type === "SECTION" || isSectionLintChildType(type);
}

/** Node types collected as lint targets inside a section. */
export function isSectionLintChildType(type: string): boolean {
	return (
		type === "FRAME" ||
		type === "COMPONENT" ||
		type === "COMPONENT_SET" ||
		type === "INSTANCE"
	);
}
