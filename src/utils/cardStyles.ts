export type CardStyle = 'default' | 'rounded' | 'stroked' | 'elevated' | 'minimal';

export function getCardClasses(style: CardStyle, color: string, compact = false): string {
  const base = compact ? 'p-3' : 'p-5';
  const common = 'cursor-pointer transition-[background] duration-150 ease-out bg-white border border-[#E9E9E7] rounded-[8px] hover:bg-[#F7F7F5]';

  switch (style) {
    case 'rounded':
      return `${base} ${common}`;

    case 'stroked':
      return `${base} ${common}`;

    case 'elevated':
      return `${base} ${common}`;

    case 'minimal':
      return `${base} bg-white border border-[#E9E9E7] rounded-[8px] hover:bg-[#F7F7F5] transition-[background] duration-150 ease-out ${common.split(' ').slice(1).join(' ')}`.replace('  ', ' ');

    default:
      return `${base} ${common}`;
  }
}

export function getCardInlineStyle(style: CardStyle, color: string): React.CSSProperties {
  switch (style) {
    case 'rounded':
      return { borderColor: '#E9E9E7' };

    case 'stroked':
      return { borderColor: '#E9E9E7' };

    case 'elevated':
      return { borderColor: '#E9E9E7' };

    case 'minimal':
      return { borderColor: '#E9E9E7' };

    default:
      return { borderColor: '#E9E9E7' };
  }
}
