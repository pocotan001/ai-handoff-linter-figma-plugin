import { ArrowLeftIcon } from "lucide-react";
import { Button } from "~/components/button";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "~/components/field";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/select";
import { Switch } from "~/components/switch";
import { LOCALE_PREFERENCES } from "../core/locales";
import {
	CONFIGURABLE_RULES,
	formatRuleId,
	getRuleDescription,
} from "../core/rules";
import type { UiSettings } from "../core/settings";
import type { Messages } from "./i18n";

export function SettingsView({
	onBack,
	onChange,
	settings,
	t,
}: {
	onBack: () => void;
	onChange: (settings: UiSettings) => void;
	settings: UiSettings;
	t: Messages;
}) {
	const toggleRule = (ruleId: string, enabled: boolean) => {
		const disabledRules = enabled
			? settings.disabledRules.filter((r) => r !== ruleId)
			: [...settings.disabledRules, ruleId];
		onChange({ ...settings, disabledRules });
	};

	return (
		<section className="flex h-full min-h-0 min-w-0 flex-col bg-background">
			<div className="flex shrink-0 items-center gap-2 border-b px-4 py-3">
				<Button
					aria-label={t.cancel}
					size="sm"
					variant="ghost"
					className="px-2 text-xs"
					onClick={onBack}
				>
					<ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
					{t.settings}
				</Button>
			</div>
			<div className="min-h-0 flex-1 overflow-auto overscroll-contain p-4">
				<FieldGroup>
					<FieldSet>
						<FieldLegend>{t.language}</FieldLegend>
						<Field>
							<Select
								value={settings.language}
								onValueChange={(value) =>
									onChange({
										...settings,
										language: value as UiSettings["language"],
									})
								}
							>
								<SelectTrigger className="h-8 w-full text-xs">
									<SelectValue>
										{t.languageOptions[settings.language]}
									</SelectValue>
								</SelectTrigger>
								<SelectContent alignItemWithTrigger={false} className="w-40">
									<SelectGroup>
										{LOCALE_PREFERENCES.map((language) => (
											<SelectItem key={language} value={language}>
												{t.languageOptions[language]}
											</SelectItem>
										))}
									</SelectGroup>
								</SelectContent>
							</Select>
						</Field>
					</FieldSet>

					<FieldSet>
						<FieldLegend>{t.rules}</FieldLegend>
						{CONFIGURABLE_RULES.map((ruleId) => (
							<Field key={ruleId} orientation="horizontal">
								<FieldContent>
									<FieldLabel htmlFor={`rule-${ruleId}`}>
										{formatRuleId(ruleId)}
									</FieldLabel>
									<FieldDescription>
										{getRuleDescription(ruleId, t.issueCopy)}
									</FieldDescription>
								</FieldContent>
								<Switch
									id={`rule-${ruleId}`}
									checked={!settings.disabledRules.includes(ruleId)}
									onCheckedChange={(enabled) => toggleRule(ruleId, enabled)}
								/>
							</Field>
						))}
					</FieldSet>
				</FieldGroup>
			</div>
		</section>
	);
}
