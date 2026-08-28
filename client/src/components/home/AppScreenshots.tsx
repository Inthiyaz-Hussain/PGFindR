import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const screenshots = [
  "Screenshot 2026-08-27 163938.png",
  "Screenshot 2026-08-27 163958.png",
  "Screenshot 2026-08-27 164009.png",
  "Screenshot 2026-08-27 164023.png",
  "Screenshot 2026-08-27 164035.png",
  "Screenshot 2026-08-27 164048.png",
  "Screenshot 2026-08-27 164118.png",
  "Screenshot 2026-08-27 164131.png",
  "Screenshot 2026-08-27 164141.png",
  "Screenshot 2026-08-27 164150.png",
  "Screenshot 2026-08-27 164204.png",
  "Screenshot 2026-08-27 164218.png"
];

export function AppScreenshots() {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((selectedImageIndex + 1) % screenshots.length);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((selectedImageIndex - 1 + screenshots.length) % screenshots.length);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto mt-16 px-4">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-3">
          Platform Sneak Peek
        </h2>
        <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto">
          Take a look at our intuitive interfaces designed for both seekers and property owners. Experience seamless property management and discovery.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {screenshots.map((img, idx) => (
          <div 
            key={idx} 
            className="group relative aspect-[9/16] overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 cursor-pointer hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all duration-300"
            onClick={() => setSelectedImageIndex(idx)}
          >
            <img 
              src={`/${img}`} 
              alt={`Platform screenshot ${idx + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
              <span className="text-xs font-semibold text-white bg-indigo-600/80 px-3 py-1 rounded-full backdrop-blur-sm">View</span>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImageIndex !== null && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 sm:p-8 animate-in fade-in duration-200"
          onClick={() => setSelectedImageIndex(null)}
        >
          <button 
            className="absolute top-4 right-4 sm:top-8 sm:right-8 p-2 rounded-full bg-slate-800/50 text-white hover:bg-slate-700 transition-colors z-10"
            onClick={() => setSelectedImageIndex(null)}
          >
            <X className="h-6 w-6" />
          </button>
          
          <button 
            className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-800/50 text-white hover:bg-slate-700 transition-colors z-10 hidden sm:flex"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-8 w-8" />
          </button>

          <button 
            className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-800/50 text-white hover:bg-slate-700 transition-colors z-10 hidden sm:flex"
            onClick={handleNext}
          >
            <ChevronRight className="h-8 w-8" />
          </button>

          <img 
            src={`/${screenshots[selectedImageIndex]}`} 
            alt="Platform preview enlarged"
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          />
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium bg-slate-900/50 px-4 py-1 rounded-full backdrop-blur-sm sm:hidden">
            Swipe or tap edges to navigate
          </div>
        </div>
      )}
    </div>
  );
}
