import type { PiiCategory } from "./patterns";

/**
 * A character-offset span of detected PII. `start`/`end` are indices into the
 * text passed to {@link NerDetector.detect} (`end` exclusive). `category`
 * becomes the placeholder tag prefix (e.g. "PERSON" → `[PERSON_1]`); it may be
 * any string, conventionally `PERSON` / `LOCATION` / `ORG` for NER entities.
 */
export interface PiiSpan {
  start: number;
  end: number;
  category: PiiCategory | (string & {});
  /** Optional model confidence in [0,1]; informational (filter in the detector). */
  score?: number;
}

/**
 * Detects unstructured PII in text. Implementations run a model (or service)
 * and return spans. The SDK defensively clamps spans to the text bounds and
 * snaps them to whole-word boundaries before use, so a detector returning a
 * sub-word span cannot corrupt the output — but a detector should still return
 * its cleanest spans.
 *
 * `detect` should be deterministic (same text → same spans): the redactor uses
 * the returned order as a placeholder-numbering tiebreak, so a nondeterministic
 * detector can produce unstable placeholder numbers across runs.
 */
export interface NerDetector {
  detect(text: string): Promise<PiiSpan[]>;
}
