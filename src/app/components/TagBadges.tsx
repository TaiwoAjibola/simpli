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
  const textSize = size === 'xs' ? 'text-[10px]' : 'text-xs';

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map(tag => (
        <span
          key={tag.id}
          className={`inline-flex items-center gap-0.5 ${px} ${py} ${textSize} leading-none`}
          style={{ backgroundColor: `${tag.color}20`, color: tag.color, borderLeft: `2px solid ${tag.color}` }}
        >
          {tag.name}
          {onRemove && (
            <button onClick={() => onRemove(tag.id)} className="hover:opacity-60 ml-0.5">
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </span>
      ))}
    </div>
  );
}
