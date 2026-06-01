/**
 * Cross-platform primitive constants.
 *
 * This module is intentionally dependency-free and side-effect-free so it can
 * be loaded by *any* consumer — including React Native / Hermes — without
 * pulling in the rest of the SDK. It is published as the `@anuma/sdk/constants`
 * subpath (which carries a `react-native` export condition); slim consumers
 * such as the agent packages import values from here instead of the bare
 * `@anuma/sdk` entry, whose Node/web bundle is not RN-safe.
 *
 * Only add genuinely pure, cross-platform constants here (numeric/string
 * literals, default IDs, size caps). No classes, no runtime APIs, no imports.
 */

/** Character cap for multiline / textarea fields. Agent gateways (e.g. cf-tasks)
 *  truncate values to this length before interpolating them into prompt templates.
 *  Shared across all agent packages so a single change updates every journey
 *  declaration simultaneously. */
export const MULTILINE_FIELD_MAX = 50_000;
