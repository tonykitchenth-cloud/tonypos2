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

