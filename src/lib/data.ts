import { UnifiedZipCode } from "../index.js";
import payload from "../../data/unified-zip-codes.json" with { type: "json" };

/**
 * One instance per serverless container, built on first request and reused
 * for the life of the container.
 */
let instance: UnifiedZipCode | null = null;

export function db(): UnifiedZipCode {
  if (!instance) instance = new UnifiedZipCode(payload as never);
  return instance;
}
