import type { SourceKind, XtractResponse } from "./xtract";

export type GameOption = {
  label: string;
  cash: number;
  net: number;
  debt: number;
  note: string;
};

export type GameSource = {
  headline: string;
  url: string;
  sourceName?: string;
  evidence?: string;
  signalId?: string;
  sourceKind?: SourceKind;
  extractionMode?: XtractResponse["mode"];
  fallbackReason?: string;
};

export type GameCard = {
  id?: string;
  kind: "life" | "news";
  title: string;
  body: string;
  source?: GameSource;
  options: GameOption[];
};
