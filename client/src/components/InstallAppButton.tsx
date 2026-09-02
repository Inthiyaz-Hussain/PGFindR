import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function InstallAppButton() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const handleDownloadApk = () => {
    window.location.href = '/findpgroom.apk';
  };

  // We only show the button aggressively if we're on mobile
  if (!isMobile) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      <Button 
        size="lg" 
        onClick={handleDownloadApk}
        className="rounded-full shadow-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center h-14 px-6 border-2 border-white/20"
      >
        <Download className="size-5 mr-2" />
        Download App
      </Button>
    </div>
  );
}
