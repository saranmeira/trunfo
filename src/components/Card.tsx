import React from 'react';
import type { Card as CardType } from '../types/game';
import { Heart, Diamond, Club, Spade } from 'lucide-react';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  disabled?: boolean;
  hidden?: boolean;
  selected?: boolean;
  noBorder?: boolean;
}

export const Card: React.FC<CardProps> = ({ card, onClick, disabled, hidden, selected, noBorder }) => {
  const getSuitIcon = (suit: string) => {
    const iconProps = {
      className: `${selected ? 'w-10 h-10' : 'w-8 h-8'} ${
        suit === '♥' || suit === '♦' ? 'text-red-500 fill-red-500' : 'text-black fill-black'
      }`,
    };
    
    switch(suit) {
      case '♥': return <Heart {...iconProps} />;
      case '♦': return <Diamond {...iconProps} />;
      case '♣': return <Club {...iconProps} />;
      case '♠': return <Spade {...iconProps} />;
      default: return null;
    }
  };

  if (hidden) {
    return (
      <div className="w-20 h-28 bg-gray-900 rounded-lg shadow-lg border-2 border-gray-700 flex items-center justify-center">
        <span className="text-gray-500 text-2xl">?</span>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${selected ? 'w-24 h-32' : 'w-20 h-28'} 
        bg-white rounded-lg shadow-lg ${noBorder ? '' : 'border-2'}
        flex flex-col items-center justify-center transition-all duration-200
        ${!noBorder && selected ? 'border-blue-500 scale-110 shadow-2xl' : !noBorder ? 'border-gray-300' : ''}
        ${!disabled && !selected ? 'hover:scale-105 hover:shadow-xl cursor-pointer hover:border-blue-400' : ''}
        ${disabled ? 'opacity-50' : ''}
      `}
    >
      <div className="flex flex-col items-center justify-center">
        {getSuitIcon(card.suit)}
        <span className={`${selected ? 'text-3xl' : 'text-2xl'} font-bold mt-1`}>
          {card.rank}
        </span>
      </div>
    </button>
  );
};