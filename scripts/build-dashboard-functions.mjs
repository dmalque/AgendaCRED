// Generate one-file copies of the tested functions for Supabase's web editor.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripTypeScriptTypes } from 'node:module';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'supabase', 'functions');
const destination = join(root, 'supabase', 'dashboard');
const read = async (path) => (await readFile(join(source, path), 'utf8')).replace(/\r\n/g, '\n');
const shared = await read('_shared/credentials.ts');
await mkdir(destination, { recursive: true });
for (const name of ['staff-login', 'invite-staff']) {
  const handler = (await read(`${name}/handler.ts`)).replace(
    /^import .* from ['"]\.\.\/_shared\/credentials\.ts['"];?\n/gm,
    '',
  );
  const entry = (await read(`${name}/index.ts`)).replace(
    /^import .* from ['"]\.\/handler\.ts['"];?\n/gm,
    '',
  );
  const text = `// GENERATED from supabase/functions. Regenerate instead of editing this copy.\n// Paste this ENTIRE file into index.ts in the Supabase web editor.\n${shared}\n${handler}\n${entry}`;
  if (/from ['"]\.\.?\//.test(text)) throw new Error(`Unresolved local import: ${name}`);
  stripTypeScriptTypes(text);
  await writeFile(join(destination, `${name}.ts`), text);
  console.log(`Preparado: supabase/dashboard/${name}.ts`);
}
