/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Camera,
  Volume2,
  VolumeX,
  Bell,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Eye,
  Compass,
} from 'lucide-react';
import { soundManager } from '../game/audio';

interface ControlsDockProps {
  onCameraPreset: (preset: 'follow' | 'entrance' | 'hall' | 'room' | 'closeup') => void;
  isCloseup: boolean;
  onOpenHelp: () => void;
  activeModel: 'procedural' | 'glb';
  isGlbLoaded: boolean;
  onToggleModel: () => void;
  onToggleZen: () => void;
  isZen: boolean;
}

export const ControlsDock: React.FC<ControlsDockProps> = ({
  onCameraPreset,
  isCloseup,
  onOpenHelp,
  activeModel,
  isGlbLoaded,
  onToggleModel,
  onToggleZen,
  isZen,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });
  const [isMuted, setIsMuted] = useState(soundManager.getMuted());

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundManager.setMuted(next);
  };

  const handleRingBell = () => {
    soundManager.playBell();
  };

  if (isZen) {
    return (
      <button
        onClick={onToggleZen}
        className="fixed z-20 bottom-4 right-4 bg-[#2a1810]/80 hover:bg-[#2a1810] text-[#fff3d6] px-3 py-1.5 rounded-sm text-xs font-semibold flex items-center gap-1.5 shadow-md border border-[#fff3d6]/30 transition-colors"
      >
        <Eye className="w-3.5 h-3.5" />
        <span>Afficher l'interface</span>
      </button>
    );
  }

  return (
    <div className="fixed z-20 bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto max-w-[95vw]">
      {/* Toggle dock handle */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#fff3d6] bg-[#2a1810]/85 hover:bg-[#2a1810] px-2.5 py-0.5 rounded-t-xs border-t border-x border-[#fff3d6]/30 flex items-center gap-1 cursor-pointer transition-colors"
      >
        {isCollapsed ? (
          <>
            <ChevronUp className="w-3 h-3" />
            <span>Options & Vues</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3 h-3" />
            <span>Réduire</span>
          </>
        )}
      </button>

      {/* Dock container */}
      {!isCollapsed && (
        <div className="bg-[#2a1810]/90 text-[#fff3d6] border border-[#fff3d6]/40 rounded-sm p-2 sm:px-4 sm:py-2.5 shadow-lg flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs">
          {/* Camera views */}
          <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xs border border-white/10">
            <span className="text-[10px] uppercase font-bold text-[#e0d2bc] px-1 hidden sm:inline flex items-center gap-1">
              <Camera className="w-3 h-3" /> Vues:
            </span>
            <button
              onClick={() => onCameraPreset('follow')}
              className={`px-2 py-1 rounded-xs transition-colors font-medium ${
                !isCloseup ? 'bg-[#fff3d6] text-[#2a1810] font-bold' : 'hover:bg-white/10 text-[#e0d2bc]'
              }`}
            >
              Florie
            </button>
            <button
              onClick={() => onCameraPreset('entrance')}
              className="px-2 py-1 rounded-xs hover:bg-white/10 text-[#e0d2bc] transition-colors font-medium"
            >
              Arche
            </button>
            <button
              onClick={() => onCameraPreset('hall')}
              className="px-2 py-1 rounded-xs hover:bg-white/10 text-[#e0d2bc] transition-colors font-medium"
            >
              Hall
            </button>
            <button
              onClick={() => onCameraPreset('room')}
              className="px-2 py-1 rounded-xs hover:bg-white/10 text-[#e0d2bc] transition-colors font-medium"
            >
              Salle 101
            </button>
            <button
              onClick={() => onCameraPreset('closeup')}
              className={`px-2 py-1 rounded-xs transition-colors font-medium ${
                isCloseup ? 'bg-[#fffdb8] text-[#2a1810] font-bold' : 'hover:bg-white/10 text-[#e0d2bc]'
              }`}
            >
              Gros plan (V)
            </button>
          </div>

          {/* Sound controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleToggleMute}
              className="p-1.5 rounded-xs bg-black/30 hover:bg-black/50 text-[#fff3d6] transition-colors border border-white/10"
              title={isMuted ? 'Activer le son' : 'Couper le son'}
              aria-label={isMuted ? 'Activer le son' : 'Couper le son'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-300" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-300" />}
            </button>
            <button
              onClick={handleRingBell}
              className="px-2 py-1 rounded-xs bg-black/30 hover:bg-black/50 text-[#fffdb8] transition-colors border border-white/10 flex items-center gap-1 font-medium"
              title="Sonner la cloche de cours"
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cloche</span>
            </button>
          </div>

          {/* Model info & switch button */}
          <button
            onClick={onToggleModel}
            disabled={!isGlbLoaded}
            className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-xs border transition-colors ${
              activeModel === 'glb'
                ? 'bg-[#6b4228] text-[#fffdb8] border-[#fffdb8]/40'
                : 'bg-black/25 text-[#e0d2bc] hover:bg-black/40 border-white/10'
            } ${!isGlbLoaded ? 'opacity-70 cursor-default' : 'cursor-pointer'}`}
            title={isGlbLoaded ? "Changer de modèle 3D (Chibi Anime / VRoid GLB)" : "Chargement du modèle GLB..."}
          >
            <Compass className="w-3.5 h-3.5 text-[#fffdb8]" />
            <span>
              {activeModel === 'glb' ? 'Modèle : VRoid 3D' : 'Modèle : Chibi Anime'}
            </span>
          </button>

          {/* Zen mode & Help */}
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleZen}
              className="px-2 py-1 rounded-xs bg-black/30 hover:bg-black/50 text-[#e0d2bc] transition-colors border border-white/10 flex items-center gap-1"
              title="Mode Cinéma (Masquer HUD)"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Cinéma</span>
            </button>
            <button
              onClick={onOpenHelp}
              className="p-1.5 rounded-xs bg-black/30 hover:bg-black/50 text-[#fff3d6] transition-colors border border-white/10"
              title="Aide & Touches"
              aria-label="Afficher les touches"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
