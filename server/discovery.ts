import type { DiscoveryResult } from "../shared/discovery";
import { detectPackage } from "./package-json";

/**
 * Reads everything runnable from a workspace directory.
 *
 * Only the Root package is discovered for now; Nested packages and Shell
 * scripts are added by the nested-entries walk.
 */
export async function discoverEntries(
  directory: string,
): Promise<DiscoveryResult> {
  return {
    packages: [await detectPackage(directory, "")],
    shellScripts: [],
    truncated: false,
  };
}
