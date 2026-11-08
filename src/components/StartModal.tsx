/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play } from 'lucide-react';

interface StartModalProps {
  onStart: () => void;
}

export const StartModal: React.FC<StartModalProps> = ({ onStart }) => {
  return (
    <div
      id="start-overlay"
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none"
    >
      <div
        className="w-full max-w-[440px] bg-[#fff3d6] text-[#2a1810] border-2 border-[#2a1810] rounded-sm p-6 sm:p-7 shadow-[8px_8px_0_#6b4228]"
        style={{ fontFamily: "'M PLUS Rounded 1c', system-ui, sans-serif" }}
      >
        <h1
          className="text-5xl sm:text-6xl text-[#2a1810] m-0 font-normal leading-none"
          style={{ fontFamily: "'Pinyon Script', cursive" }}
        >
          Florie
        </h1>
        <p className="mt-1 mb-4 text-xs tracking-[0.2em] uppercase font-bold text-[#6b4228]">
          East High · prototype jouable
        </p>

        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 items-center text-sm mb-5">
          <span className="whitespace-nowrap font-bold">
            <kbd className="px-1.5 py-0.5 bg-[#2a1810] text-[#fff3d6] rounded-xs border-b-2 border-[#6b4228] mr-1">Z</kbd>
            <kbd className="px-1.5 py-0.5 bg-[#2a1810] text-[#fff3d6] rounded-xs border-b-2 border-[#6b4228] mr-1">Q</kbd>
            <kbd className="px-1.5 py-0.5 bg-[#2a1810] text-[#fff3d6] rounded-xs border-b-2 border-[#6b4228] mr-1">S</kbd>
            <kbd className="px-1.5 py-0.5 bg-[#2a1810] text-[#fff3d6] rounded-xs border-b-2 border-[#6b4228]">D</kbd>
          </span>
          <span className="text-xs text-[#2a1810]">Avancer, gauche, reculer, droite</span>

          <span className="whitespace-nowrap font-bold">
            <kbd className="px-1.5 py-0.5 bg-[#2a1810] text-[#fff3d6] rounded-xs border-b-2 border-[#6b4228]">Maj</kbd>
          </span>
          <span className="text-xs text-[#2a1810]">Courir</span>

          <span className="whitespace-nowrap font-bold">
            <kbd className="px-1.5 py-0.5 bg-[#2a1810] text-[#fff3d6] rounded-xs border-b-2 border-[#6b4228]">V</kbd>
          </span>
          <span className="text-xs text-[#2a1810]">Gros plan sur Florie</span>

          <span className="whitespace-nowrap font-semibold text-xs">Souris glissée</span>
          <span className="text-xs text-[#2a1810]">Tourner la caméra (ou clic pour verrouiller)</span>

          <span className="whitespace-nowrap font-bold">
            <kbd className="px-1 py-0.5 bg-[#2a1810] text-[#fff3d6] rounded-xs border-b-2 border-[#6b4228] mr-0.5">←</kbd>
            <kbd className="px-1 py-0.5 bg-[#2a1810] text-[#fff3d6] rounded-xs border-b-2 border-[#6b4228] mr-0.5">→</kbd>
            <kbd className="px-1 py-0.5 bg-[#2a1810] text-[#fff3d6] rounded-xs border-b-2 border-[#6b4228] mr-0.5">↑</kbd>
            <kbd className="px-1 py-0.5 bg-[#2a1810] text-[#fff3d6] rounded-xs border-b-2 border-[#6b4228]">↓</kbd>
          </span>
          <span className="text-xs text-[#2a1810]">Caméra au clavier</span>

          <span className="whitespace-nowrap font-semibold text-xs">Molette</span>
          <span className="text-xs text-[#2a1810]">Zoom avant / arrière</span>
        </div>

        <button
          id="go"
          type="button"
          onClick={onStart}
          className="w-full py-3 px-4 bg-[#2a1810] hover:bg-[#6b4228] text-[#fff3d6] font-bold text-base rounded-xs cursor-pointer tracking-wider flex items-center justify-center gap-2 transition-colors focus-visible:outline-3 focus-visible:outline-[#fffdb8]"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Entrer au lycée</span>
        </button>

        <p className="mt-4 mb-0 text-xs text-[#6b4228] leading-relaxed">
          Sur écran tactile : joystick virtuel à gauche, glisser ailleurs pour la caméra. Entrez par la porte vitrée, sous l'arche, pour visiter le hall et les salles 101 à 104.
        </p>
      </div>
    </div>
  );
};
