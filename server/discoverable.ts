/** Folders that never hold the user's own Packages. */
const SKIPPED_DIRECTORY_NAMES: Record<string, true> = {
  node_modules: true,
  ".git": true,
  dist: true,
  build: true,
  ".next": true,
  coverage: true,
  vendor: true,
  target: true,
  out: true,
  venv: true,
  __pycache__: true,
};

/** Directory levels below the workspace root that are walked. */
export const MAX_DEPTH = 4;
/** Packages the walk collects before it stops and reports truncation. */
export const MAX_PACKAGES = 50;

/** Whether the walk skips a folder entirely. Dot-folders are always skipped. */
export function isSkippedDirectoryName(name: string): boolean {
  return name.startsWith(".") || SKIPPED_DIRECTORY_NAMES[name] === true;
}

/**
 * Path segments of a relative path, or null when it is malformed or could
 * escape the workspace (`""`, `.` and `..` segments).
 */
export function relativeSegments(relPath: string): string[] | null {
  const segments = relPath === "" ? [] : relPath.split("/");
  return segments.some(
    (segment) => segment === "" || segment === "." || segment === "..",
  )
    ? null
    : segments;
}

/**
 * Whether discovery can list a Package in this folder: at most MAX_DEPTH
 * segments below the workspace root, none of them skipped.
 */
export function isDiscoverablePackageDir(relDir: string): boolean {
  const segments = relativeSegments(relDir);
  if (!segments || segments.length > MAX_DEPTH) return false;
  return segments.every((segment) => !isSkippedDirectoryName(segment));
}

/** Whether discovery can list this Shell script: the same walk rules. */
export function isDiscoverableShellScriptPath(relPath: string): boolean {
  const segments = relativeSegments(relPath);
  if (!segments || segments.length === 0) return false;
  if (segments.length - 1 > MAX_DEPTH) return false;
  if (!segments[segments.length - 1].endsWith(".sh")) return false;
  return segments
    .slice(0, -1)
    .every((segment) => !isSkippedDirectoryName(segment));
}
