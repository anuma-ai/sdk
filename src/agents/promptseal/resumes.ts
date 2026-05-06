/**
 * Resume corpus for the hiring agent demo.
 *
 * Verbatim copy of `agent/data/resumes.json`. The `expected_decision` field
 * is for test assertions only — the prompt builder strips it before passing
 * the resume to the LLM.
 */
import resumesJson from "./data/resumes.json";

export type Resume = {
  id: string;
  name: string;
  yoe_react: number;
  yoe_python: number;
  education: string;
  highlights: string;
  expected_decision: "hire" | "reject" | "ambiguous";
};

export const RESUMES: Resume[] = resumesJson as Resume[];

export function findResume(id: string): Resume | undefined {
  return RESUMES.find((r) => r.id === id);
}
