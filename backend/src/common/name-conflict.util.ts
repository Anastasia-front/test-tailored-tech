/**
 * Given a desired name and the set of names already taken in the target
 * folder, returns a name guaranteed not to collide — auto-suffixing
 * "file.pdf" -> "file (1).pdf" -> "file (2).pdf" the way Finder/Explorer do.
 */
export function resolveNameConflict(desiredName: string, existingNames: Set<string>): string {
  if (!existingNames.has(desiredName)) return desiredName;

  const dotIndex = desiredName.lastIndexOf('.');
  const hasExt = dotIndex > 0 && dotIndex < desiredName.length - 1;
  const base = hasExt ? desiredName.slice(0, dotIndex) : desiredName;
  const ext = hasExt ? desiredName.slice(dotIndex) : '';

  let n = 1;
  let candidate = `${base} (${n})${ext}`;
  while (existingNames.has(candidate)) {
    n += 1;
    candidate = `${base} (${n})${ext}`;
  }
  return candidate;
}
