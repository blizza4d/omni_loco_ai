'use client';

import React, { useState } from 'react';
import { NODE_TEMPLATES, NodeTemplate } from '../node-registry';
import { ProtocolNodeType, NodeCategory } from '../types';
import {
  Layers,
  Plus,
  Search,
  Sliders,
  X,
  Zap,
} from 'lucide-react';

interface NodeLibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNode: (type: ProtocolNodeType) => void;
}

export function NodeLibraryDrawer({ isOpen, onClose, onAddNode }: NodeLibraryDrawerProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | NodeCategory>('ALL');

  if (!isOpen) return null;

  const filtered = NODE_TEMPLATES.filter((t) => {
    const matchesCat = selectedCategory === 'ALL' || t.category === selectedCategory;
    const q = search.trim().toLowerCase();
    if (!q) return matchesCat;
    return (
      matchesCat &&
      (t.label.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-paper-dark border-l-2 border-charcoal-soft p-5 z-50 shadow-2xl font-mono flex flex-col justify-between">
      <div className="space-y-4 flex-1 overflow-y-auto pr-1">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-charcoal-soft pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-sage-green rounded-full animate-pulse" />
            <h3 className="font-bold text-sm tracking-technical uppercase text-charcoal-soft">
              NODE LIBRARY
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-ink-muted hover:text-charcoal-soft transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SEARCH NODES..."
              className="w-full bg-paper-cream border border-charcoal-soft pl-8 pr-3 py-1.5 text-xs rounded text-charcoal-soft placeholder:text-ink-muted focus:outline-none focus:border-brick-red"
            />
          </div>

          <div className="flex gap-1">
            {(['ALL', 'INPUT', 'PROCESSING', 'OUTPUT'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-1 py-1 text-[9px] font-bold uppercase rounded border transition-colors ${
                  selectedCategory === cat
                    ? 'border-charcoal-soft bg-charcoal-soft text-paper-cream'
                    : 'border-charcoal-soft/30 text-ink-muted hover:text-charcoal-soft'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Nodes Catalog List */}
        <div className="space-y-2.5 pt-1">
          {filtered.map((item) => {
            let catColor = 'border-sage-green text-sage-green';
            if (item.category === 'OUTPUT') catColor = 'border-brick-red text-brick-red';
            else if (item.category === 'PROCESSING') catColor = 'border-cyan-500 text-cyan-500';

            return (
              <div
                key={item.type}
                onClick={() => {
                  onAddNode(item.type);
                  onClose();
                }}
                className="p-3 border border-charcoal-soft bg-paper-cream rounded-tactile hover:border-brick-red hover:shadow-tactile cursor-pointer transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-charcoal-soft uppercase group-hover:text-brick-red transition-colors">
                    {item.label}
                  </span>
                  <span className={`text-[9px] px-1 border rounded uppercase font-bold ${catColor}`}>
                    {item.category}
                  </span>
                </div>
                <p className="text-[10px] text-ink-muted leading-relaxed mb-2">
                  {item.description}
                </p>
                <div className="flex items-center justify-between text-[9px] text-ink-muted border-t border-charcoal-soft/10 pt-1.5">
                  <span>
                    IN: {item.inputs.length} | OUT: {item.outputs.length}
                  </span>
                  <span className="font-bold flex items-center gap-0.5 text-charcoal-soft group-hover:translate-x-0.5 transition-transform">
                    <Plus className="w-2.5 h-2.5" /> ADD TO GRAPH
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-3 border-t border-charcoal-soft/20 text-center text-[10px] text-ink-muted">
        CLICK ANY NODE TO MOUNT ON BLUEPRINT CANVAS
      </div>
    </div>
  );
}
