import React, { memo } from 'react';
import { X, Heart, Sparkles, Flame, Shield, Package } from 'lucide-react';

const ICON_MAP = {
  Heart: Heart,
  Sparkles: Sparkles,
  Flame: Flame,
  Shield: Shield,
};

export const InventoryModal = memo(function InventoryModal({ isOpen, onClose, items, onUseItem }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md transition-all">
      <div className="relative w-full max-w-lg bg-slate-900/95 border border-purple-500/50 rounded-2xl shadow-[0_0_50px_rgba(147,51,234,0.3)] p-6 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-950/80 rounded-xl border border-purple-700/50 text-purple-300">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold text-purple-100 tracking-wide">
                ARCANE INVENTORY
              </h2>
              <p className="text-xs text-slate-400">
                Pinch & Hold 1s or click Close to return
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Close inventory"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inventory CSS Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5">
          {items.map((item) => {
            const IconComponent = ICON_MAP[item.icon] || Package;
            const isOutOfStock = item.count <= 0;

            return (
              <div
                key={item.id}
                className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all ${
                  isOutOfStock
                    ? 'bg-slate-900/50 border-slate-800 opacity-50'
                    : 'bg-slate-800/60 border-slate-700/70 hover:border-purple-500/80 hover:bg-slate-800 shadow-lg'
                }`}
              >
                {/* Quantity Badge */}
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-slate-950/80 rounded-full text-xs font-mono font-bold text-slate-300 border border-slate-700">
                  x{item.count}
                </div>

                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`p-2.5 rounded-xl bg-gradient-to-br ${item.color} text-white shadow-md`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="pr-8">
                    <h3 className="font-bold text-sm text-slate-100">
                      {item.name}
                    </h3>
                    <span className="text-[11px] font-semibold text-purple-300 uppercase">
                      {item.type}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                  {item.description}
                </p>

                <button
                  disabled={isOutOfStock}
                  onClick={() => onUseItem(item.id)}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    isOutOfStock
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)] active:scale-95'
                  }`}
                >
                  {isOutOfStock ? 'Depleted' : 'Use Item'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Modal Footer Note */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Gesture Shortcut: 🤏 Hold Pinch 1s</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Close Inventory
          </button>
        </div>
      </div>
    </div>
  );
});
