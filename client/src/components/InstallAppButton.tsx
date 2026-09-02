import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function InstallAppButton() {
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if the app is running in standalone mode (installed)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
    }
  }, []);

  if (isInstalled) {
    return null;
  }

  const handleDownloadApk = () => {
    window.location.href = '/findpgroom.apk';
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      <Button 
        size="lg" 
        onClick={handleDownloadApk}
        className="rounded-full shadow-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold flex items-center h-14 px-6 border-2 border-white/20"
      >
        <Download className="size-5 mr-2" />
        Install App
      </Button>
    </div>
  );
}
