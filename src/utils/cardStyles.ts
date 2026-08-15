export type CardStyle = 'default' | 'rounded' | 'stroked' | 'elevated' | 'minimal';

export function getCardClasses(style: CardStyle, color: string, compact = false): string {
  const base = compact ? 'p-3' : 'p-5';
  const common = 'cursor-pointer transition';

  switch (style) {
    case 'rounded':
      return `${base} bg-[#0F172A] border border-[rgba(34,197,94,0.1)] rounded-xl shadow-sm hover:shadow-md ${common}`;

    case 'stroked':
      return `${base} bg-[#0F172A] border-2 ${compact ? '' : 'shadow-sm'} ${common}`;

    case 'elevated':
      return `${base} bg-[#0F172A] border border-transparent hover:border-[rgba(34,197,94,0.2)] shadow-lg ${common}`;

    case 'minimal':
      return `${base} bg-transparent border border-transparent border-b hover:border-b-[rgba(34,197,94,0.3)] ${common}`;

    default:
      return `${base} bg-[#0F172A] border border-[rgba(34,197,94,0.1)] hover:shadow-lg ${common}`;
  }
}

export function getCardInlineStyle(style: CardStyle, color: string): React.CSSProperties {
  switch (style) {
    case 'rounded':
      return { borderLeft: `4px solid ${color}` };

    case 'stroked':
      return { borderColor: color, borderLeft: `4px solid ${color}` };

    case 'elevated':
      return {
        borderLeft: `4px solid ${color}`,
        boxShadow: `0 4px 14px 0 ${color}15, 0 0 0 1px ${color}08`
      };

    case 'minimal':
      return { borderBottomColor: color };

    default:
      return { borderLeft: `4px solid ${color}` };
  }
}
