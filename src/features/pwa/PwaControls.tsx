import { useEffect, useState } from 'react';
import { Download, X, WifiOff } from 'lucide-react';
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
export function PwaControls() {
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState('');
  const [standalone, setStandalone] = useState(
    () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
  );
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  useEffect(() => {
    const offer = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    const installed = () => {
      setStandalone(true);
      setInstall(null);
    };
    const online = () => setOffline(false);
    const offline = () => setOffline(true);
    window.addEventListener('beforeinstallprompt', offer);
    window.addEventListener('appinstalled', installed);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('beforeinstallprompt', offer);
      window.removeEventListener('appinstalled', installed);
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);
  async function installApp() {
    if (!install) {
      setHint('En Safari, abre Compartir y selecciona Añadir a pantalla de inicio.');
      return;
    }
    setBusy(true);
    try {
      await install.prompt();
      await install.userChoice;
      setInstall(null);
    } catch {
      setHint(
        'Abre el menú del navegador y busca Instalar aplicación o Añadir a pantalla de inicio.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {offline && (
        <div className="pwa-offline" role="status">
          <WifiOff size={18} aria-hidden="true" />
          Sin conexión. Revisa tu conexión antes de guardar registros.
        </div>
      )}
      {!standalone && !dismissed && (install || ios) && (
        <aside className="pwa-install" aria-label="Instalar AgendaCRED">
          <div>
            <strong>AgendaCRED en tu pantalla de inicio</strong>
            {hint && <p role="status">{hint}</p>}
          </div>
          <button
            type="button"
            className="button"
            onClick={() => void installApp()}
            disabled={busy}
          >
            <Download size={17} aria-hidden="true" />
            {busy ? 'Abriendo…' : install ? 'Instalar' : 'Cómo instalar'}
          </button>
          <button
            type="button"
            className="pwa-dismiss"
            aria-label="Cerrar aviso de instalación"
            onClick={() => setDismissed(true)}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </aside>
      )}
    </>
  );
}
