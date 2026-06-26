'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'arborisis-pwa-dismissed';

export function PwaEnhancer() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
    setStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
        Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone),
    );
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let active = true;
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        if (!active) return;
        setRegistration(reg);
        if (reg.waiting) setUpdateReady(true);
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateReady(true);
            }
          });
        });
      })
      .catch(() => undefined);

    const hadController = Boolean(navigator.serviceWorker.controller);
    const onControllerChange = () => {
      if (hadController) window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      active = false;
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  async function installApp() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {}
  }

  function applyUpdate() {
    registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  }

  const showInstall = !standalone && !!deferredPrompt && !dismissed;
  const showUpdate = updateReady;

  if (!showInstall && !showUpdate) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[65] lg:bottom-4 lg:left-auto lg:right-4 lg:max-w-sm">
      <div className="rounded-2xl border border-canopy-700/35 bg-bark-950/95 p-3 shadow-2xl shadow-black/60 backdrop-blur-2xl">
        <p className="text-xs text-canopy-100/80">
          {showUpdate
            ? 'Une nouvelle version est prête.'
            : "Installer Arborisis pour l'utiliser comme une app mobile."}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={showUpdate ? applyUpdate : installApp}
            className="btn btn-primary min-h-9 px-3 py-1.5 text-xs"
          >
            {showUpdate ? 'Mettre à jour' : 'Installer'}
          </button>
          <button
            type="button"
            onClick={showUpdate ? () => setUpdateReady(false) : dismiss}
            className="btn btn-ghost min-h-9 px-3 py-1.5 text-xs"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
