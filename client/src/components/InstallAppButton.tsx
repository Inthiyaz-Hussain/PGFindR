import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      window.location.href = '/findpgroom.apk';
      return;
    }
    
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDownloadApk = () => {
    window.location.href = '/findpgroom.apk';
  };

  if (isInstalled) return null;

  // We only show the button aggressively if we're on mobile OR a prompt is available
  if (!isMobile && !deferredPrompt) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="lg" className="rounded-full shadow-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center h-14 px-6 border-2 border-white/20">
            <Download className="size-5 mr-2" />
            Install App
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 p-2 shadow-xl border-emerald-100 rounded-xl">
          {deferredPrompt && (
            <DropdownMenuItem onClick={handleInstallClick} className="cursor-pointer py-3 px-4 mb-1 font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg">
              Install to Home Screen (PWA)
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleDownloadApk} className="cursor-pointer py-3 px-4 font-medium text-slate-700 hover:bg-slate-100 rounded-lg">
            Download Android APK (.apk)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
