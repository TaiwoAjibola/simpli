import { X } from 'lucide-react';

type Tag = { id: string; name: string; color: string };

type TagBadgesProps = {
  tagIds?: string[];
  allTags: Tag[];
  onRemove?: (tagId: string) => void;
  size?: 'sm' | 'xs';
};

export function TagBadges({ tagIds, allTags, onRemove, size = 'xs' }: TagBadgesProps) {
  const tags = (tagIds || []).map(id => allTags.find(t => t.id === id)).filter(Boolean) as Tag[];
  if (tags.length === 0) return null;

  const px = size === 'xs' ? 'px-1.5' : 'px-2';
  const py = size === 'xs' ? 'py-0.5' : 'py-1';
  const textSize = size === 'xs' ? 'text-[11px]' : 'text-xs';

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map(tag => (
        <span
          key={tag.id}
          className={`inline-flex items-center gap-1 ${px} ${py} ${textSize} leading-none rounded-[4px] border border-[#E9E9E7] bg-[#F7F7F5] font-medium`}
          style={{ color: '#37352F', borderColor: '#E9E9E7' }}
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
          {tag.name}
          {onRemove && (
            <button onClick={() => onRemove(tag.id)} className="hover:text-[#EB5757] ml-0.5 transition duration-150 cursor-pointer">
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </span>
      ))}
    </div>
  );
}
