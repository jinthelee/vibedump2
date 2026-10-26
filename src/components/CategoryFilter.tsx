import React from 'react';

interface CategoryFilterProps {
  categories: { name: string; count: number }[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onSelectCategory
}) => {
  const allCount = categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="w-full overflow-x-auto scrollbar-none py-1">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onSelectCategory('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border-2 border-[#0A0A0A] transition-all whitespace-nowrap shrink-0 ${
            selectedCategory === 'all'
              ? 'bg-[#FFD23F] text-[#0A0A0A] shadow-[2px_2px_0_#0A0A0A] translate-x-0.5'
              : 'bg-white text-[#0A0A0A] hover:bg-[#F1F0E8] shadow-[1px_1px_0_#0A0A0A]'
          }`}
        >
          <span>전체</span>
          <span className="font-mono text-[11px] opacity-80 tabular-nums">({allCount})</span>
        </button>

        {categories.map((cat) => {
          const isActive = selectedCategory === cat.name;
          return (
            <button
              key={cat.name}
              onClick={() => onSelectCategory(cat.name)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border-2 border-[#0A0A0A] transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-[#FFD23F] text-[#0A0A0A] shadow-[2px_2px_0_#0A0A0A] translate-x-0.5'
                  : 'bg-white text-[#0A0A0A] hover:bg-[#F1F0E8] shadow-[1px_1px_0_#0A0A0A]'
              }`}
            >
              <span>{cat.name}</span>
              <span className="font-mono text-[11px] opacity-80 tabular-nums">({cat.count})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
