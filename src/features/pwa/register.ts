// Network-only application assets ensure a fresh version on each online launch.
export function registerPwa() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  void navigator.serviceWorker
    .register('/sw.js', { scope: '/', updateViaCache: 'none' })
    .then((registration) => {
      const update = () => {
        if (navigator.onLine) void registration.update().catch(() => {});
      };
      window.addEventListener('online', update);
      window.addEventListener('focus', update);
    })
    .catch(() => {
      /* The online application remains usable when installation is unavailable. */
    });
}
