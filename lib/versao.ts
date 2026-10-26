// Identifica a versão publicada (a Vercel informa o commit de cada deploy)
export const VERSAO =
  process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || "local";
