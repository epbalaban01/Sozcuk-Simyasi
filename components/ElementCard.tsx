import React from 'react';
import { AlchemyElement } from '../types';

interface ElementCardProps {
  element: AlchemyElement;
  onClick?: () => void;
  onDragStart: (e: React.DragEvent) => void;
  className?: string;
  isNew?: boolean;
}

export const ElementCard: React.FC<ElementCardProps> = ({ 
  element, 
  onClick, 
  onDragStart, 
  className = '',
  isNew 
}) => {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={`
        relative select-none cursor-grab active:cursor-grabbing
        flex items-center gap-2 px-3 py-2 rounded-lg
        bg-slate-800 border border-slate-700 shadow-md
        hover:bg-slate-700 hover:border-purple-500 hover:shadow-purple-500/20
        transition-all duration-200 group
        ${className}
      `}
    >
      <span className="text-2xl filter drop-shadow-sm">{element.emoji}</span>
      <span className="font-medium text-slate-200 text-sm sm:text-base whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">
        {element.name}
      </span>
      
      {isNew && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
        </span>
      )}
    </div>
  );
};