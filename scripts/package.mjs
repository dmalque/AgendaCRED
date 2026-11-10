import { lstat, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const destination = process.argv[2]
  ? resolve(process.argv[2])
  : join(root, '.exports', `AgendaCRED-${manifest.version}-${Date.now()}.zip`);
const files = {};

async function includeFile(path) {
  const info = await lstat(path);
  if (info.isSymbolicLink() || !info.isFile()) {
    throw new Error(`Archivo inesperado: ${relative(root, path)}`);
  }
  const name = relative(root, path).split('\\').join('/');
  files[`AgendaCRED/${name}`] = new Uint8Array(await readFile(path));
}

async function includeDirectory(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error('No se incluyen enlaces en el paquete.');
    const file = join(path, entry.name);
    if (entry.isDirectory()) await includeDirectory(file);
    else await includeFile(file);
  }
}

for (const directory of ['src', 'public', 'supabase', 'scripts', '.vscode']) {
  await includeDirectory(join(root, directory));
}
for (const name of [
  'package.json',
  'package-lock.json',
  'REQUISITOS.txt',
  'README.md',
  'INSTALAR.md',
  '.prettierrc.json',
  '.prettierignore',
  '.gitattributes',
  'tsconfig.json',
  'vite.config.ts',
  'vercel.json',
  'index.html',
  '.env.example',
  '.gitignore',
  '.node-version',
  '.nvmrc',
])
  await includeFile(join(root, name));
for (const entry of await readdir(join(root, 'docs'), { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.md'))
    await includeFile(join(root, 'docs', entry.name));
}

await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, zipSync(files, { level: 6 }), { flag: 'wx' });
console.log(`ZIP creado: ${destination}`);
console.log(
  `${Object.keys(files).length} archivos. Sin .env.local, datos, dependencias ni runtime.`,
);
