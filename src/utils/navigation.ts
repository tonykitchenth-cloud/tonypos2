export type AppRoute = 'customer' | 'owner';

/**
 * Detects whether the current browser URL points to the Owner Dashboard (/owner)
 * or Customer Ordering (/), accounting for GitHub Pages repository subpaths, trailing slashes,
 * hash routing fallback, and SPA redirect search queries (?/owner).
 */
export function getAppRoute(): AppRoute {
  if (typeof window === 'undefined') return 'customer';

  // 1. Normalize pathname: remove trailing slashes for consistent comparison
  const path = window.location.pathname.replace(/\/+$/, '');
  const hash = window.location.hash;
  const search = window.location.search;

  // 2. Check if search query holds SPA redirect path (e.g. ?/owner or ?/owner/ or ?owner)
  if (
    search.startsWith('?/owner') ||
    search.startsWith('?owner') ||
    search.includes('/owner')
  ) {
    return 'owner';
  }

  // 3. Match pathname (/owner, /owner/, /owner/index.html, or /<repo-name>/owner) or hash (#/owner or #owner)
  if (
    path.endsWith('/owner') ||
    path === '/owner' ||
    path.endsWith('/owner/index.html') ||
    path.includes('/owner/') ||
    hash === '#/owner' ||
    hash === '#owner'
  ) {
    return 'owner';
  }

  return 'customer';
}

/**
 * Calculates the appropriate base path for the application,
 * preserving any GitHub Pages repository subpath (e.g. /tonys-kitchen/).
 */
export function getBaseAppPath(): string {
  if (typeof window === 'undefined') return '/';

  const isGitHub = window.location.hostname.endsWith('github.io');
  const segments = window.location.pathname.split('/').filter(Boolean);

  // If deployed on github.io with a repository subpath (e.g. /my-repo/ or /my-repo/owner)
  if (isGitHub && segments.length > 0 && segments[0] !== 'owner') {
    return `/${segments[0]}/`;
  }

  return '/';
}

/**
 * Navigates between Customer Ordering (/) and Owner Dashboard (/owner)
 * using the HTML5 History API while maintaining GitHub Pages compatibility.
 */
export function navigateTo(route: AppRoute) {
  if (typeof window === 'undefined') return;

  const basePath = getBaseAppPath();
  const targetPath = route === 'owner' ? `${basePath}owner` : basePath;

  if (window.location.pathname !== targetPath || window.location.search) {
    window.history.pushState({ route }, '', targetPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}
