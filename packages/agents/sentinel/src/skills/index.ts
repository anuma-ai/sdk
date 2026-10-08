import type { SkillConfig } from "@anuma/sdk";

import { chargebackAssistant } from "./chargeback-assistant";
import { collectionResponse } from "./collection-response";
import { subscriptionChecker } from "./subscription-checker";

export { chargebackAssistant, collectionResponse, subscriptionChecker };

/** All Sentinel finance skills in registration order. */
export const SENTINEL_SKILLS: SkillConfig[] = [
  subscriptionChecker,
  chargebackAssistant,
  collectionResponse,
];
