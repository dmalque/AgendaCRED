export const usernamePattern = /^[a-z][a-z0-9._-]{2,23}$/;
export const normalizeUsername = (value: string) => value.trim().toLowerCase();
export const usernameHint =
  'Usa 3 a 24 caracteres: letras, números, punto, guion o guion bajo; empieza con una letra.';
