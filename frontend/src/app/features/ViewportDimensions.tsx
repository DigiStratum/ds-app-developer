import { useState, useEffect } from 'react';

/**
 * ViewportDimensions - Shows current viewport width x height
 * 
 * Fixed position overlay in bottom-right corner that updates on resize.
 * Shows current Tailwind breakpoint (xs/sm/md/lg/xl/2xl).
 */
export function ViewportDimensions() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Determine current Tailwind breakpoint
  const getBreakpoint = (width: number): string => {
    if (width >= 1536) return '2xl';
    if (width >= 1280) return 'xl';
    if (width >= 1024) return 'lg';
    if (width >= 768) return 'md';
    if (width >= 640) return 'sm';
    return 'xs';
  };

  const breakpoint = getBreakpoint(dimensions.width);

  return (
    <div
      className="fixed bottom-4 right-4 z-50 px-3 py-2 rounded-lg shadow-lg border text-sm font-mono"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        color: '#fff',
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-blue-400 font-bold">{breakpoint}</span>
        <span className="text-gray-300">
          {dimensions.width} × {dimensions.height}
        </span>
      </div>
    </div>
  );
}
