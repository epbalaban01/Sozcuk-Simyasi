import React, { useState, useEffect, useRef, useCallback } from 'react';
import { combineElements } from './services/geminiService';
import { AlchemyElement, WorkbenchItem, CombinationResult } from './types';
import { ElementCard } from './components/ElementCard';

// Initial base elements
const INITIAL_ELEMENTS: AlchemyElement[] = [
  { id: 'water', name: 'Su', emoji: '💧' },
  { id: 'fire', name: 'Ateş', emoji: '🔥' },
  { id: 'earth', name: 'Toprak', emoji: '🌱' },
  { id: 'wind', name: 'Hava', emoji: '💨' },
];

const App: React.FC = () => {
  const [inventory, setInventory] = useState<AlchemyElement[]>(INITIAL_ELEMENTS);
  const [workbenchItems, setWorkbenchItems] = useState<WorkbenchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'info'} | null>(null);
  
  // Refs for drag and drop coordinates
  const workbenchRef = useRef<HTMLDivElement>(null);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('alchemy_inventory');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setInventory(parsed);
        }
      } catch (e) {
        console.error("Failed to load save", e);
      }
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('alchemy_inventory', JSON.stringify(inventory));
  }, [inventory]);

  // Helper to add new discovery
  const discoverElement = useCallback((result: CombinationResult) => {
    setInventory(prev => {
      const exists = prev.some(e => e.name === result.name);
      if (exists) return prev;
      
      const newElement: AlchemyElement = {
        id: crypto.randomUUID(),
        name: result.name,
        emoji: result.emoji,
        isNew: true
      };

      setNotification({ msg: `Yeni Keşif: ${result.emoji} ${result.name}!`, type: 'success' });
      setTimeout(() => setNotification(null), 3000);

      return [...prev, newElement];
    });
  }, []);

  // Handle mixing logic
  const handleMix = async (itemA: WorkbenchItem, itemB: WorkbenchItem) => {
    // Prevent mixing the exact same instance (sanity check)
    if (itemA.instanceId === itemB.instanceId) return;

    setIsLoading(true);
    setLoadingMsg(`${itemA.emoji} + ${itemB.emoji} karıştırılıyor...`);

    // Remove both items from workbench visually immediately
    setWorkbenchItems(prev => prev.filter(i => i.instanceId !== itemA.instanceId && i.instanceId !== itemB.instanceId));

    const result = await combineElements(itemA.name, itemB.name);

    setIsLoading(false);
    setLoadingMsg('');

    if (result) {
      discoverElement(result);
      
      // Calculate midpoint for the result to appear
      const midX = (itemA.x + itemB.x) / 2;
      const midY = (itemA.y + itemB.y) / 2;

      const newWorkbenchItem: WorkbenchItem = {
        id: crypto.randomUUID(), // temp id
        name: result.name,
        emoji: result.emoji,
        x: midX,
        y: midY,
        instanceId: crypto.randomUUID()
      };

      setWorkbenchItems(prev => [...prev, newWorkbenchItem]);
    } else {
      setNotification({ msg: "Bu kombinasyon bir şey oluşturmadı.", type: 'info' });
      setTimeout(() => setNotification(null), 2000);
      // Put items back if failed (optional, but here we just clear them to keep board clean)
    }
  };

  // Drag Start
  const handleDragStart = (e: React.DragEvent, item: AlchemyElement, source: 'INVENTORY' | 'WORKBENCH', instanceId?: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ item, source, instanceId }));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  // Drop on Workbench
  const handleDropOnWorkbench = (e: React.DragEvent) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData('application/json');
    if (!dataStr) return;

    const { item, source, instanceId } = JSON.parse(dataStr);
    
    if (!workbenchRef.current) return;
    const rect = workbenchRef.current.getBoundingClientRect();
    
    // Calculate relative position
    const clientX = e.clientX;
    const clientY = e.clientY;
    const x = clientX - rect.left - 40; // Center offset roughly
    const y = clientY - rect.top - 20;

    // Check for overlap with existing items to trigger mix
    const overlapThreshold = 50;
    const overlappingItem = workbenchItems.find(wItem => {
      if (source === 'WORKBENCH' && wItem.instanceId === instanceId) return false;
      return Math.abs(wItem.x - x) < overlapThreshold && Math.abs(wItem.y - y) < overlapThreshold;
    });

    if (overlappingItem) {
      // Create a temporary object for the dragged item to pass to mix
      const draggedItemAsWorkbench: WorkbenchItem = { ...item, x, y, instanceId: instanceId || 'temp' };
      handleMix(overlappingItem, draggedItemAsWorkbench);
    } else {
      // Just place it
      if (source === 'INVENTORY') {
        const newItem: WorkbenchItem = {
          ...item,
          x,
          y,
          instanceId: crypto.randomUUID()
        };
        setWorkbenchItems(prev => [...prev, newItem]);
      } else if (source === 'WORKBENCH' && instanceId) {
        // Move existing
        setWorkbenchItems(prev => prev.map(i => 
          i.instanceId === instanceId ? { ...i, x, y } : i
        ));
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const clearWorkbench = () => setWorkbenchItems([]);
  const resetGame = () => {
    if (confirm('Tüm ilerlemeniz silinecek. Emin misiniz?')) {
      setInventory(INITIAL_ELEMENTS);
      setWorkbenchItems([]);
      localStorage.removeItem('alchemy_inventory');
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row overflow-hidden bg-slate-900 text-slate-100">
      
      {/* Main Workbench Area */}
      <div 
        className="flex-1 relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 to-slate-950 overflow-hidden"
        onDragOver={handleDragOver}
        onDrop={handleDropOnWorkbench}
        ref={workbenchRef}
      >
        {/* Header / Controls */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-20 pointer-events-none">
          <div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 filter drop-shadow-lg">
              Sözcük Simyası
            </h1>
            <p className="text-slate-400 text-sm">Kafana göre takıl.</p>
          </div>
          <div className="flex gap-2 pointer-events-auto">
            <button onClick={clearWorkbench} className="p-2 bg-slate-800/50 hover:bg-slate-700 rounded-full backdrop-blur text-slate-300 transition-colors" title="Masaüstünü Temizle">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
            <button onClick={resetGame} className="p-2 bg-slate-800/50 hover:bg-red-900/50 rounded-full backdrop-blur text-slate-300 hover:text-red-400 transition-colors" title="Oyunu Sıfırla">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className={`absolute top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl backdrop-blur-md border animate-pop ${
            notification.type === 'success' ? 'bg-green-500/20 border-green-500 text-green-200' : 'bg-slate-700/50 border-slate-600 text-slate-200'
          }`}>
            {notification.msg}
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/20 backdrop-blur-sm">
             <div className="relative w-16 h-16">
                <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-purple-500/30 animate-ping"></div>
                <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
             </div>
             <p className="mt-4 font-medium text-purple-200 animate-pulse">{loadingMsg}</p>
          </div>
        )}

        {/* Placed Items */}
        {workbenchItems.map((item) => (
          <div
            key={item.instanceId}
            style={{ 
              position: 'absolute', 
              left: item.x, 
              top: item.y,
              zIndex: 10
            }}
            className="animate-pop"
          >
            <ElementCard 
              element={item}
              onDragStart={(e) => handleDragStart(e, item, 'WORKBENCH', item.instanceId)}
              className="cursor-move shadow-xl scale-110 bg-slate-700/80 backdrop-blur-sm border-slate-600"
            />
          </div>
        ))}
        
        {/* Empty State Hint */}
        {workbenchItems.length === 0 && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
            <span className="text-6xl font-bold uppercase tracking-widest text-slate-500">Karıştırma Alanı</span>
          </div>
        )}
      </div>

      {/* Sidebar Inventory */}
      <div className="h-1/3 md:h-full md:w-80 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col shadow-2xl z-30">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex justify-between items-center">
          <h2 className="font-semibold text-slate-300">Keşifler ({inventory.length})</h2>
          <div className="text-xs text-slate-500">Sürükle bırak</div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="flex flex-wrap gap-2 content-start">
            {inventory.map((item) => (
              <ElementCard 
                key={item.id} 
                element={item}
                onDragStart={(e) => handleDragStart(e, item, 'INVENTORY')}
                // On mobile, tap adds to center
                onClick={() => {
                  if (window.innerWidth < 768) {
                     const newItem: WorkbenchItem = {
                        ...item,
                        x: window.innerWidth / 2 - 50 + (Math.random() * 40 - 20),
                        y: window.innerHeight / 3 + (Math.random() * 40 - 20), // Approx center of top area
                        instanceId: crypto.randomUUID()
                      };
                      setWorkbenchItems(prev => [...prev, newItem]);
                  }
                }}
                isNew={item.isNew}
              />
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default App;