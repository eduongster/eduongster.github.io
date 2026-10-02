/** Prefix a public/ file with the configured base path (works at / or /repo-name/). */
export const withBase = (path: string) => {
  const base = import.meta.env.BASE_URL;
  return `${base.endsWith('/') ? base : `${base}/`}${path.replace(/^\//, '')}`;
};

/** Format metres the way a dive computer would: 4,000 m. */
export const formatDepth = (m: number) => `${Math.round(m).toLocaleString('en-US')} m`;
