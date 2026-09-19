export type SourceKind = "live" | "cached-demo";
export type SignalDirection = "increase" | "decrease" | "risk" | "opportunity" | "neutral";
export type SignalMagnitude = "low" | "medium" | "high";

export interface RawDocument {
  id: string;
  headline: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  content: string;
  sourceKind: SourceKind;
}

export interface NewsSignal {
  id: string;
  headline: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  topic: string;
  signal: string;
  affectedArea: string;
  direction: SignalDirection;
  magnitude: SignalMagnitude;
  evidence: string;
  sourceSection: string;
  explanation: string;
  gameRelevance: string;
  sourceKind: SourceKind;
}

export interface FinancialEffects {
  monthlyExpenses?: number;
  monthlyIncome?: number;
  savings?: number;
  debt?: number;
  creditScore?: number;
  emergencyRisk?: number;
}

export interface ScenarioChoice {
  text: string;
  consequenceText: string;
  financialEffects: FinancialEffects;
}

export interface GeneratedLifeEvent {
  id: string;
  title: string;
  description: string;
  ageRange: [number, number];
  category: string;
  newsSignalId: string;
  sourceAttribution: Pick<NewsSignal, "headline" | "sourceName" | "sourceUrl" | "publishedAt" | "evidence">;
  choices: ScenarioChoice[];
}

export interface XtractResponse {
  signal: NewsSignal | null;
  scenario: GeneratedLifeEvent | null;
  mode: "ai" | "deterministic-fallback";
  error?: string;
  fallbackReason?: string;
}
