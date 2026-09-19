import type { RawDocument } from "@/types/xtract";

export interface NewsSource {
  readonly id: string;
  readonly name: string;
  fetch(): Promise<RawDocument[]>;
}
