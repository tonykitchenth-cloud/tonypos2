export type AppRoute = 'customer' | 'owner';

/**
 * Detects whether the current browser URL points to the Owner Dashboard (/owner)
 * or Customer Ordering (/), accounting for GitHub Pages repository subpaths and trailing slashes.
 */
export function getAppRoute(): AppRoute {
  if (typeof window === 'undefined') return 'customer';

  // Normalize pathname: remove trailing slashes for consistent comparison
  const path = window.location.pathname.replace(/\/+$/, '');
  const hash = window.location.hash;

  // Match /owner or /<repo-name>/owner or hash #/owner
  if (
    path.endsWith('/owner') ||
    path === '/owner' ||
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

  const currentPath = window.location.pathname;
  const segments = currentPath.split('/').filter(Boolean);

  if (segments.length === 0) return '/';

  // If currently at /owner or /repo-name/owner
  if (segments[segments.length - 1] === 'owner') {
    const parentSegments = segments.slice(0, -1);
    return parentSegments.length > 0 ? `/${parentSegments.join('/')}/` : '/';
  }

  // If already at /repo-name/
  return `/${segments.join('/')}/`;
}

/**
 * Navigates between Customer Ordering (/) and Owner Dashboard (/owner)
 * using the HTML5 History API while maintaining GitHub Pages compatibility.
 */
export function navigateTo(route: AppRoute) {
  if (typeof window === 'undefined') return;

  const basePath = getBaseAppPath();
  const targetPath = route === 'owner' ? `${basePath}owner` : basePath;

  if (window.location.pathname !== targetPath) {
    window.history.pushState({ route }, '', targetPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}
