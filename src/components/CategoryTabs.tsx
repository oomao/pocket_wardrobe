interface Props {
  categories: string[];
  active: string;
  onChange: (c: string) => void;
  includeAll?: boolean;
}

export default function CategoryTabs({ categories, active, onChange, includeAll = true }: Props) {
  const tabs = includeAll ? ['全部', ...categories] : categories;
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-3 py-1 rounded-full text-sm border ${
            active === t
              ? 'bg-brand-500 text-white border-brand-500'
              : 'bg-white text-gray-700 border-gray-300 hover:border-brand-500'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
