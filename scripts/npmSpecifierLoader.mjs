/**
 * Remap Deno-style `npm:pkg@version` / `npm:@scope/pkg@version` imports
 * to bare package names so Node (tests) and tooling can resolve them.
 */
export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith('npm:')) {
    return nextResolve(specifier, context);
  }

  const body = specifier.slice(4);
  let bare;
  if (body.startsWith('@')) {
    const slash = body.indexOf('/');
    if (slash === -1) {
      return nextResolve(specifier, context);
    }
    const scope = body.slice(0, slash);
    const nameAndVersion = body.slice(slash + 1);
    const name = nameAndVersion.replace(/@[^/]*$/, '');
    bare = `${scope}/${name}`;
  } else {
    bare = body.replace(/@[^/]*$/, '');
  }

  return nextResolve(bare, context);
}
