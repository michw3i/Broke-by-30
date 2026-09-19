import type { GameCard, GameOption } from "@/types/game";
import type { GeneratedLifeEvent, NewsSignal, XtractResponse } from "@/types/xtract";

function convertChoice(choice: GeneratedLifeEvent["choices"][number]): GameOption {
  const effects = choice.financialEffects;
  return {
    label: choice.text,
    cash: effects.savings ?? 0,
    net: (effects.monthlyIncome ?? 0) - (effects.monthlyExpenses ?? 0),
    debt: effects.debt ?? 0,
    note: choice.consequenceText,
  };
}

export function convertXtractScenarioToGameEvent(
  scenario: GeneratedLifeEvent,
  signal: NewsSignal,
  extractionMode: XtractResponse["mode"],
  fallbackReason?: string,
): GameCard {
  return {
    id: `xtract-${scenario.id}`,
    kind: "news",
    title: scenario.title.toUpperCase(),
    body: scenario.description,
    options: scenario.choices.map(convertChoice),
    source: {
      headline: scenario.sourceAttribution.headline,
      url: scenario.sourceAttribution.sourceUrl,
      sourceName: scenario.sourceAttribution.sourceName,
      evidence: scenario.sourceAttribution.evidence,
      signalId: scenario.newsSignalId,
      sourceKind: signal.sourceKind,
      extractionMode,
      fallbackReason,
    },
  };
}
