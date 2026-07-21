import React, { useState, useMemo } from 'react';
import { Item, CutListItem } from '../types';
import { Layers, Scissors, Info, Sparkles } from 'lucide-react';

interface NestingOptimizerProps {
  item: Item;
  qtyMultiplier: number;
}

interface NestedBar {
  barIndex: number;
  cuts: {
    length: number;
    description: string;
    originalIdx: number;
    color: string;
  }[];
  usedLength: number;
  waste: number;
  yieldPercent: number;
}

export default function NestingOptimizer({ item, qtyMultiplier }: NestingOptimizerProps) {
  const [stockLength, setStockLength] = useState<number>(6000); // 6m standard bar
  const [bladeKerf, setBladeKerf] = useState<number>(3); // 3mm blade thickness
  const [selectedProfile, setSelectedProfile] = useState<string>('');

  // Extract unique steel profiles from the item's cut list
  const availableProfiles = useMemo(() => {
    if (!item.cutList || item.cutList.length === 0) return [];
    const profiles = new Set<string>();
    item.cutList.forEach((c) => {
      profiles.add(`${c.type} - ${c.size}`);
    });
    return Array.from(profiles);
  }, [item.cutList]);

  // Set default profile on load
  const activeProfile = selectedProfile || availableProfiles[0] || '';

  // Run 1D first-fit-decreasing bin-packing algorithm
  const nestedResults = useMemo(() => {
    if (!activeProfile || !item.cutList) return null;

    // Filter cut items belonging to the selected profile size
    const filteredCuts = item.cutList.filter((c) => {
      const currentProfileKey = `${c.type} - ${c.size}`;
      return currentProfileKey === activeProfile;
    });

    // Expand cuts by specified assembly multiplier
    const rawCutsToNest: { length: number; description: string; originalIdx: number }[] = [];
    filteredCuts.forEach((c, idx) => {
      const finalQty = c.qty * qtyMultiplier;
      for (let i = 0; i < finalQty; i++) {
        rawCutsToNest.push({
          length: c.lengthMm,
          description: c.description,
          originalIdx: idx,
        });
      }
    });

    // Sort cuts descending (decreases packing space wastage)
    const sortedCuts = [...rawCutsToNest].sort((a, b) => b.length - a.length);

    // List of packed bars
    const bars: NestedBar[] = [];

    // Distinct theme colors for segmented pieces
    const colors = [
      'bg-brand-orange-500 text-black',
      'bg-[#a855f7] text-white',
      'bg-[#3b82f6] text-white',
      'bg-[#10b981] text-black',
      'bg-[#eab308] text-black',
      'bg-[#ec4899] text-white',
      'bg-[#14b8a6] text-black',
    ];

    sortedCuts.forEach((piece) => {
      // Validate piece can physically fit inside an empty bar
      if (piece.length > stockLength) {
        // Can't fit piece in standard bar, create a mock overflow bar
        bars.push({
          barIndex: bars.length + 1,
          cuts: [{
            length: piece.length,
            description: `${piece.description} [OVERSIZED]`,
            originalIdx: piece.originalIdx,
            color: 'bg-red-600 text-white',
          }],
          usedLength: piece.length,
          waste: 0,
          yieldPercent: 100,
        });
        return;
      }

      // Try to fit the piece into an existing packed bar
      let placed = false;
      for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        // Total occupied space = sum of piece lengths + (count * kerf spacing)
        const currentKerfTotal = bar.cuts.length * bladeKerf;
        const totalBarSpaceNeeded = bar.usedLength + currentKerfTotal + piece.length;

        if (totalBarSpaceNeeded <= stockLength) {
          bar.cuts.push({
            length: piece.length,
            description: piece.description,
            originalIdx: piece.originalIdx,
            color: colors[piece.originalIdx % colors.length],
          });
          bar.usedLength += piece.length;
          placed = true;
          break;
        }
      }

      // If no bar has enough remaining capacity, allocate a brand new stock bar
      if (!placed) {
        bars.push({
          barIndex: bars.length + 1,
          cuts: [{
            length: piece.length,
            description: piece.description,
            originalIdx: piece.originalIdx,
            color: colors[piece.originalIdx % colors.length],
          }],
          usedLength: piece.length,
          waste: 0,
          yieldPercent: 0,
        });
      }
    });

    // Finalize individual bars: compute waste and yields
    bars.forEach((bar) => {
      const activeKerfSum = (bar.cuts.length - 1) * bladeKerf;
      bar.waste = stockLength - (bar.usedLength + Math.max(0, activeKerfSum));
      bar.yieldPercent = Math.round(((bar.usedLength) / stockLength) * 100);
    });

    // Compute aggregations
    const totalBarsUsed = bars.length;
    const totalPhysicalUsedMm = bars.reduce((sum, bar) => sum + bar.usedLength, 0);
    const totalOverallWasteMm = bars.reduce((sum, bar) => sum + bar.waste, 0);
    const overallYieldPercent = totalBarsUsed > 0 
      ? Math.round((totalPhysicalUsedMm / (totalBarsUsed * stockLength)) * 100) 
      : 0;

    return {
      bars,
      metrics: {
        totalBarsUsed,
        totalPhysicalUsedMm,
        totalOverallWasteMm,
        overallYieldPercent,
      },
      cutDefinitionCount: rawCutsToNest.length,
    };
  }, [activeProfile, item.cutList, qtyMultiplier, stockLength, bladeKerf]);

  if (availableProfiles.length === 0) {
    return (
      <div className="text-center py-10 bg-black/40 border border-white/5 text-gray-500 font-sans">
        <Layers className="mx-auto text-gray-700 mb-2" size={24} />
        No linear profile parts (RHS, Flat bars, CHS, SHS, etc.) found in the engineering cut list.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuration controller widget */}
      <div className="p-5 bg-black border border-white/5 flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div className="space-y-1 shrink-0">
          <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block font-mono">
            Optimizing Structural Steel Dimension
          </label>
          <select
            value={activeProfile}
            onChange={(e) => setSelectedProfile(e.target.value)}
            className="bg-[#121212] text-white border border-white/10 p-2 text-xs font-mono font-bold uppercase outline-none focus:border-brand-orange-500 max-w-full"
          >
            {availableProfiles.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block font-mono">
            Standard Raw Material Stock Length
          </label>
          <div className="flex items-center gap-1">
            <select
              value={stockLength}
              onChange={(e) => setStockLength(parseInt(e.target.value))}
              className="bg-[#121212] text-white border border-white/10 p-2 text-xs font-mono font-bold outline-none focus:border-brand-orange-500 w-32"
            >
              <option value={3000}>3,000 mm (3m)</option>
              <option value={6000}>6,000 mm (6m standard)</option>
              <option value={7500}>7,500 mm (7.5m)</option>
              <option value={9000}>9,000 mm (9m heavy)</option>
              <option value={12000}>12,000 mm (12m structural)</option>
            </select>
            <span className="text-[10px] text-gray-400 font-mono pl-1">mm</span>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-gray-500 uppercase font-bold tracking-widest block font-mono">
            CNC Saw Blade Kerf Margin
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={15}
              value={bladeKerf}
              onChange={(e) => setBladeKerf(parseFloat(e.target.value) || 0)}
              className="bg-[#121212] text-white border border-[#222] p-2 text-xs font-mono font-bold w-16 text-center focus:border-brand-orange-500 outline-none"
            />
            <span className="text-[10px] text-gray-400 font-mono pl-1">mm</span>
          </div>
        </div>

        <div className="p-3 bg-brand-orange-500/5 border border-brand-orange-500/10 flex items-center gap-3 md:ml-auto max-w-sm">
          <Sparkles className="text-brand-orange-400 shrink-0" size={16} />
          <div className="text-[11px] text-gray-300">
            <strong>Bin Packing active:</strong> Automatically minimizing offcut scrap via recursive 1D First-Fit Decreasing (FFD) heuristics.
          </div>
        </div>
      </div>

      {nestedResults && (
        <div className="space-y-6">
          {/* Dashboard Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-black border border-white/5 space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest font-mono">Required Raw Stock Bars</span>
              <div className="text-2xl font-bold font-mono text-white">
                {nestedResults.metrics.totalBarsUsed}{' '}
                <span className="text-xs text-gray-400 font-sans">lengths</span>
              </div>
            </div>

            <div className="p-4 bg-black border border-white/5 space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest font-mono">Total Net Cuts Run</span>
              <div className="text-2xl font-bold font-mono text-brand-orange-400">
                {nestedResults.cutDefinitionCount}{' '}
                <span className="text-xs text-gray-400 font-sans">pieces</span>
              </div>
            </div>

            <div className="p-4 bg-black border border-white/5 space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest font-mono">Raw Yield Efficiency</span>
              <div className="text-2xl font-bold font-mono text-green-400">
                {nestedResults.metrics.overallYieldPercent}%
              </div>
            </div>

            <div className="p-4 bg-black border border-white/5 space-y-1">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest font-mono">Accumulated Scrap Metal</span>
              <div className="text-2xl font-bold font-mono text-yellow-500">
                {(nestedResults.metrics.totalOverallWasteMm / 1000).toFixed(2)}{' '}
                <span className="text-xs text-gray-400 font-sans">meters</span>
              </div>
            </div>
          </div>

          {/* Visual Nest Map list */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                <Scissors size={15} className="text-brand-orange-500" />
                Structural Raw Material Nesting Layouts
              </h4>
              <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">
                Target Profile: <strong className="text-white">{activeProfile}</strong>
              </span>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {nestedResults.bars.map((bar) => {
                return (
                  <div key={bar.barIndex} className="p-4 bg-black border border-white/10 space-y-3 rounded-none">
                    <div className="flex justify-between items-center text-xs font-mono border-b border-white/5 pb-2">
                      <span className="font-bold text-gray-300">RAW BAR STOCK #{bar.barIndex}</span>
                      <div className="flex gap-4">
                        <span>Used: <strong className="text-white">{bar.usedLength} mm</strong></span>
                        <span className="text-yellow-500">Scrap: <strong>{bar.waste} mm</strong></span>
                        <span className="text-green-400">Yield: <strong>{bar.yieldPercent}%</strong></span>
                      </div>
                    </div>

                    {/* Progress nested piece segments representation block */}
                    <div className="h-10 w-full bg-[#111] flex overflow-hidden border border-white/5">
                      {bar.cuts.map((cut, cutIdx) => {
                        const proportionWidth = (cut.length / stockLength) * 100;
                        return (
                          <div
                            key={cutIdx}
                            style={{ width: `${proportionWidth}%` }}
                            className={`${cut.color} h-full border-r border-[#000]/30 relative group flex items-center justify-center cursor-pointer hover:brightness-110 active:brightness-95 transition-all p-1`}
                            title={`${cut.description}: ${cut.length}mm`}
                          >
                            <span className="font-mono text-[9px] font-bold overflow-hidden text-ellipsis whitespace-nowrap select-none font-mono tracking-tighter">
                              {cut.length}mm
                            </span>
                            
                            {/* Hover info panel bubble */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-black border border-white/10 text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 font-sans p-3 tracking-normal rounded-none shadow-2xl transition-opacity pointer-events-none z-50">
                              <p className="font-bold text-white uppercase text-brand-orange-500 mb-0.5">{cut.description}</p>
                              <p className="font-mono">Piece Length: <strong className="text-white">{cut.length}mm</strong></p>
                              <p className="font-mono text-gray-500">Template Part #{cut.originalIdx + 1}</p>
                            </div>
                          </div>
                        );
                      })}

                      {/* Remaining Scrap block segment */}
                      {bar.waste > 0 && (
                        <div
                          style={{ width: `${(bar.waste / stockLength) * 100}%` }}
                          className="bg-black text-[10px] font-mono text-gray-500 h-full flex items-center justify-center select-none font-medium pattern-slant"
                        >
                          <span className="hidden sm:inline font-mono tracking-tighter text-[8px]">{bar.waste}mm offcut</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
