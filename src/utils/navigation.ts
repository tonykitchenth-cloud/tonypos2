export type AppRoute = 'customer' | 'owner' | 'rider';

/**
 * Detects whether the current browser URL points to the Rider View (/rider),
 * Owner Dashboard (/owner), or Customer Ordering (/), accounting for GitHub Pages
 * repository subpaths, trailing slashes, hash routing fallback, and SPA redirect search queries.
 */
export function getAppRoute(): AppRoute {
  if (typeof window === 'undefined') return 'customer';

  // 1. Normalize pathname: remove trailing slashes for consistent comparison
  const path = window.location.pathname.replace(/\/+$/, '');
  const hash = window.location.hash;
  const search = window.location.search;

  // 2. Rider View Route Match (?view=rider, ?rider, /rider, #/rider)
  if (
    search.startsWith('?/rider') ||
    search.startsWith('?rider') ||
    search.includes('view=rider') ||
    search.includes('route=rider') ||
    search.includes('/rider')
  ) {
    return 'rider';
  }

  if (
    path.endsWith('/rider') ||
    path === '/rider' ||
    path.endsWith('/rider/index.html') ||
    path.includes('/rider/') ||
    hash === '#/rider' ||
    hash === '#rider'
  ) {
    return 'rider';
  }

  // 3. Owner Dashboard Route Match (e.g. ?/owner or ?owner)
  if (
    search.startsWith('?/owner') ||
    search.startsWith('?owner') ||
    search.includes('/owner')
  ) {
    return 'owner';
  }

  // Match pathname (/owner, /owner/, /owner/index.html, or /<repo-name>/owner) or hash (#/owner or #owner)
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
  if (isGitHub && segments.length > 0 && segments[0] !== 'owner' && segments[0] !== 'rider') {
    return `/${segments[0]}/`;
  }

  return '/';
}

/**
 * Navigates between Customer Ordering (/), Owner Dashboard (/owner), and Rider View (/rider)
 * using the HTML5 History API while maintaining GitHub Pages compatibility.
 */
export function navigateTo(route: AppRoute) {
  if (typeof window === 'undefined') return;

  const basePath = getBaseAppPath();
  const targetPath =
    route === 'owner'
      ? `${basePath}owner`
      : route === 'rider'
      ? `${basePath}rider`
      : basePath;

  if (window.location.pathname !== targetPath || window.location.search) {
    window.history.pushState({ route }, '', targetPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}

/**
 * Returns a universal, direct shareable URL for delivery riders
 * that works seamlessly on GitHub Pages, custom domains, and local preview.
 */
export function getRiderShareUrl(): string {
  if (typeof window === 'undefined') return '/?view=rider';
  const origin = window.location.origin;
  const basePath = getBaseAppPath();
  return `${origin}${basePath}?view=rider`;
}

/**
 * Resolves the restaurant logo URL, ensuring relative paths resolve
 * cleanly against GitHub Pages repository subpaths or root domain.
 * Automatically upgrades any legacy demo Unsplash placeholders to the official Tony's Kitchen logo.
 */
export function getLogoUrl(logoUrl?: string): string {
  const basePath = getBaseAppPath();
  const defaultLogo = `${basePath}apple-touch-icon.png`;

  if (!logoUrl) return defaultLogo;

  // Upgrade legacy Unsplash placeholder
  if (typeof logoUrl === 'string' && logoUrl.includes('images.unsplash.com/photo-1555396273-367ea4eb4db5')) {
    return defaultLogo;
  }

  // Preserve external URLs (https://...) and uploaded data URLs (data:image/...)
  if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://') || logoUrl.startsWith('data:')) {
    return logoUrl;
  }

  // Relative path (e.g. ./apple-touch-icon.png or apple-touch-icon.png)
  const cleanPath = logoUrl.replace(/^\.\//, '');
  return `${basePath}${cleanPath}`;
}

