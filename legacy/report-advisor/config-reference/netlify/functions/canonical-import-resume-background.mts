import { handleCanonicalImport } from './canonical-import-execute.mts';

export default async (request: Request): Promise<void> => {
  const response = await handleCanonicalImport(request);
  if (!response.ok) {
    const detail = await response.text();
    console.error('[canonical-import-resume-background] canonical execution failed', detail.slice(0, 2000));
    throw new Error(`CANONICAL_IMPORT_BACKGROUND_EXECUTION_FAILED:${response.status}`);
  }
};

export const config = {
  background: true,
};