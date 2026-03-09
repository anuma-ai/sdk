export type TestCase = {
  id: string;
  conversation: { role: "user" | "assistant"; content: string }[];
  groundTruthFacts: string[];
  groundTruthStructured: StructuredFact[];
  difficulty: "easy" | "medium" | "hard";
  scenarios: string[];
};

export type StructuredFact = {
  type: "identity" | "preference" | "project" | "skill" | "constraint";
  namespace: string;
  key: string;
  value: string;
};

export type TeacherTrace = {
  testCaseId: string;
  reasoning: string;
  extractedFacts: string[];
  extractedStructured: StructuredFact[];
  correct: boolean;
};

export type EvalResult = {
  testCaseId: string;
  difficulty: string;
  withSkill: {
    precision: number;
    recall: number;
    f1: number;
    extractedFacts: string[];
  };
  withoutSkill: {
    precision: number;
    recall: number;
    f1: number;
    extractedFacts: string[];
  };
};

export type EvalSummary = {
  totalCases: number;
  withSkill: { avgPrecision: number; avgRecall: number; avgF1: number };
  withoutSkill: { avgPrecision: number; avgRecall: number; avgF1: number };
  byDifficulty: Record<string, { withSkill: { avgF1: number }; withoutSkill: { avgF1: number } }>;
};
