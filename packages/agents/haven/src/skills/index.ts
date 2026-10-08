import type { SkillConfig } from "@anuma/sdk";

import { demandLetter } from "./demand-letter";
import { hoaDispute } from "./hoa-dispute";
import { leaseReview } from "./lease-review";
import { rentIncreaseChecker } from "./rent-increase-checker";

export { demandLetter, hoaDispute, leaseReview, rentIncreaseChecker };

export const HAVEN_SKILLS: SkillConfig[] = [
  leaseReview,
  demandLetter,
  rentIncreaseChecker,
  hoaDispute,
];
