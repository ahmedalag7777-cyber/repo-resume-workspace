const RELATIVE = /^(?:\.\.?\/|\/)/;
const EXTENSIONS = ['.ts', '.tsx', '.js', '.mjs'];
const TS_RUNTIME_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts'];

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (!RELATIVE.test(specifier) || error?.code !== 'ERR_MODULE_NOT_FOUND') {
      throw error;
    }
    const hasExtension = /\.[a-z0-9]+$/i.test(specifier);
    const extensionCandidates = hasExtension && specifier.endsWith('.js')
      ? [specifier.slice(0, -3), ...TS_RUNTIME_EXTENSIONS.map(extension => specifier.slice(0, -3) + extension)]
      : [specifier, ...EXTENSIONS.map(extension => specifier + extension)];
    for (const candidate of extensionCandidates) {
      if (!candidate || candidate === specifier) continue;
      try {
        return await nextResolve(candidate, context);
      } catch {
        // Continue to the next compatible source extension.
      }
    }
    for (const extension of EXTENSIONS) {
      try {
        return await nextResolve(`${specifier}${extension}`, context);
      } catch {
        // Continue to the next explicit source extension.
      }
    }
    throw error;
  }
}
