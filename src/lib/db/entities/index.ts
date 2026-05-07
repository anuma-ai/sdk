/**
 * Barrel for the entity / memory_entity tables — the W5 graph-lane
 * storage that the auto-extraction worker writes to and the recall
 * graph lane reads from.
 */

export { Entity, MemoryEntity } from "./models.js";
export {
  type EntityOperationsContext,
  getMemoriesByEntityNamesOp,
  linkMemoryEntitiesOp,
} from "./operations.js";
export type { CreateEntityOptions, EntityKind, StoredEntity } from "./types.js";
