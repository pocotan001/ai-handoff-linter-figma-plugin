import type { Locale } from "./locales";

export type IssueCopy = {
	message: string;
	recommendation: string;
};

// Single source of truth for rule copy. The linter embeds the English copy in
// each issue; the UI swaps in the copy for the active locale by rule id.
export const ISSUE_COPY: Record<Locale, Record<string, IssueCopy>> = {
	en: {
		"target-frame": {
			message:
				"Lint target must be a section, frame, component, component set, or instance.",
			recommendation:
				"Select a section, frame, component, component set, or instance before running the linter.",
		},
		"root-auto-layout": {
			message: "Root frame has multiple children but does not use Auto Layout.",
			recommendation:
				"Use Auto Layout on the root frame or split the design into clearer frame sections.",
		},
		"avoid-groups": {
			message:
				"Group nodes are harder to translate into semantic DOM structure.",
			recommendation:
				"Replace groups with frames when the layer represents layout.",
		},
		"semantic-layer-name": {
			message: "Layer name is too generic to infer implementation intent.",
			recommendation:
				"Rename the layer to describe its role, such as Header, PrimaryButton, or ErrorMessage.",
		},
		"prefer-variables-or-styles": {
			message:
				"Layer appears to use raw visual values instead of variables or styles.",
			recommendation:
				"Bind colors, typography, spacing, or effects to Figma variables/styles where possible.",
		},
		"missing-auto-layout": {
			message: "This frame has multiple children but does not use Auto Layout.",
			recommendation:
				"Add Auto Layout to enable consistent spacing and alignment.",
		},
		"fixed-size-container": {
			message: "This Auto Layout frame has a fixed size on its primary axis.",
			recommendation:
				"Consider switching to Hug contents so the frame adapts to its children.",
		},
		"missing-text-style": {
			message: "Text layer has no Text Style applied.",
			recommendation:
				"Apply a Text Style so the typography maps to a design token in code.",
		},
		"image-without-alt-hint": {
			message: "Image layer name does not describe its content.",
			recommendation:
				"Rename the layer to describe the image so the AI can generate meaningful alt text.",
		},
		"deep-nesting": {
			message: "This layer is nested more than 5 levels deep.",
			recommendation:
				"Extract deeply nested layers into separate components to simplify the hierarchy.",
		},
		"absolute-positioning": {
			message:
				"This layer is absolutely positioned inside an Auto Layout frame.",
			recommendation:
				"Keep layers in the Auto Layout flow; use absolute positioning only for intentional overlays such as badges.",
		},
		"duplicate-sibling-names": {
			message: "Multiple sibling layers share the same name.",
			recommendation:
				"If the layers have different roles, give them unique names. If they are repeated list items, turn them into a component and place instances instead.",
		},
		"placeholder-text": {
			message: "Text layer contains placeholder text.",
			recommendation:
				"Replace placeholder copy with realistic content so the layer's purpose is clear.",
		},
		"instance-internal-issues": {
			message:
				"Instance contents have lint issues that cannot be fixed on this instance.",
			recommendation:
				"Open the main component and fix the structure or naming issues there.",
		},
		"default-variant-property-names": {
			message:
				'Component set uses default variant property names such as "Property 1".',
			recommendation:
				"Rename variant properties to describe their role, such as Size, State, or Type.",
		},
		"missing-component-description": {
			message: "Component has no description.",
			recommendation:
				"Add a short description so the component's purpose and usage are clear.",
		},
		"invisible-layer": {
			message: "This layer is hidden and will generate dead code.",
			recommendation: "Remove hidden layers or document why they are kept.",
		},
		"too-many-children": {
			message: "This frame has too many direct children.",
			recommendation:
				"Break it into smaller components to keep the hierarchy manageable.",
		},
		"too-long-name": {
			message: "Layer name is too long to use as a code identifier.",
			recommendation:
				"Keep layer names under 50 characters for clean component and variable names.",
		},
	},
	ja: {
		"target-frame": {
			message:
				"Lint 対象として選択できるのは Section、Frame、Component、Component Set、Instance のいずれかです。",
			recommendation:
				"Lint を実行する前に、Section、Frame、Component、Component Set、Instance のいずれかを選択してください。",
		},
		"root-auto-layout": {
			message:
				"ルートフレームに複数の子要素がありますが、Auto Layout が使われていません。",
			recommendation:
				"ルートフレームに Auto Layout を適用するか、デザインをより明確なフレーム単位に分割してください。",
		},
		"avoid-groups": {
			message: "Group ノードは意味のある DOM 構造へ変換しにくくなります。",
			recommendation:
				"レイヤーがレイアウトを表す場合は、Group ではなく Frame に置き換えてください。",
		},
		"semantic-layer-name": {
			message:
				"レイヤー名が汎用的すぎるため、実装時の意図を推測しにくくなっています。",
			recommendation:
				"Header、PrimaryButton、ErrorMessage など、役割が分かる名前に変更してください。",
		},
		"prefer-variables-or-styles": {
			message:
				"レイヤーが Variables や Styles ではなく、直接入力した見た目の値を使っているようです。",
			recommendation:
				"可能な範囲で、色・タイポグラフィ・スペーシング・エフェクトを Figma の Variables/Styles に紐づけてください。",
		},
		"missing-auto-layout": {
			message:
				"このフレームに複数の子要素がありますが、Auto Layout が使われていません。",
			recommendation:
				"Auto Layout を追加して、間隔と整列を一貫させてください。",
		},
		"fixed-size-container": {
			message:
				"この Auto Layout フレームはメイン軸のサイズが固定されています。",
			recommendation:
				"子要素に合わせてサイズが変わるよう「Hug contents」への切り替えを検討してください。",
		},
		"missing-text-style": {
			message: "テキストレイヤーに Text Style が適用されていません。",
			recommendation:
				"タイポグラフィをコードのデザイントークンに紐づけるため、Text Style を適用してください。",
		},
		"image-without-alt-hint": {
			message: "画像レイヤーの名前が内容を説明していません。",
			recommendation:
				"AI が意味のある alt テキストを生成できるよう、画像の内容が分かる名前に変更してください。",
		},
		"deep-nesting": {
			message: "このレイヤーは 5 階層を超えてネストされています。",
			recommendation:
				"深くネストされたレイヤーを別のコンポーネントに切り出して、階層をシンプルにしてください。",
		},
		"absolute-positioning": {
			message: "このレイヤーは Auto Layout フレーム内で絶対配置されています。",
			recommendation:
				"レイヤーは Auto Layout のフローに沿って配置し、絶対配置はバッジなど意図的なオーバーレイに限定してください。",
		},
		"duplicate-sibling-names": {
			message: "同じ名前のレイヤーが同じ階層に複数あります。",
			recommendation:
				"別の役割のレイヤーなら重複しない名前を付けてください。繰り返しのリスト項目なら、コンポーネント化してインスタンスを並べてください。",
		},
		"placeholder-text": {
			message: "テキストレイヤーにプレースホルダーテキストが含まれています。",
			recommendation:
				"レイヤーの目的が伝わるよう、ダミーテキストを実際に近いコンテンツに置き換えてください。",
		},
		"instance-internal-issues": {
			message:
				"インスタンスの内部に、このインスタンス上では修正できない指摘があります。",
			recommendation:
				"メインコンポーネントを開いて、構造や命名の問題をそちらで修正してください。",
		},
		"default-variant-property-names": {
			message:
				"コンポーネントセットのバリアントプロパティ名が「Property 1」などの初期値のままです。",
			recommendation:
				"Size、State、Type など、役割が分かる名前にバリアントプロパティをリネームしてください。",
		},
		"missing-component-description": {
			message: "コンポーネントに説明（description）がありません。",
			recommendation:
				"コンポーネントの目的と使い方が伝わるよう、短い説明を追加してください。",
		},
		"invisible-layer": {
			message: "このレイヤーは非表示のため、使われないコードが生成されます。",
			recommendation:
				"非表示レイヤーを削除するか、残している理由をドキュメント化してください。",
		},
		"too-many-children": {
			message: "このフレームの直接の子要素が多すぎます。",
			recommendation:
				"階層を管理しやすくするため、小さなコンポーネントに分割してください。",
		},
		"too-long-name": {
			message:
				"レイヤー名が長すぎてコードの識別子として使いにくくなっています。",
			recommendation:
				"コンポーネント名や変数名を扱いやすく保つため、レイヤー名は 50 文字以内にしてください。",
		},
	},
};
