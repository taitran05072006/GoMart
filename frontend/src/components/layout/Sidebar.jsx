import React, { useEffect, useMemo, useState } from 'react';
import categoryService from '../../services/categoryService';

const Sidebar = ({ onCategorySelect, selectedCategory }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    categoryService.getAll()
      .then(res => {
        const data = res.data || res;
        setCategories(data);
      })
      .catch(() => setError('Failed to load categories'))
      .finally(() => setLoading(false));
  }, []);

  // filter category theo search
  const filteredCategories = useMemo(() => {
    return categories.filter(cat =>
      cat.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [categories, search]);

  return (
    <div className="bg-white/95 backdrop-blur-sm md:bg-white rounded-xl shadow-sm border border-gray-100 p-2 md:p-4 h-full">

      {/* Header */}
      <h3 className="font-bold text-gray-800 uppercase tracking-wider mb-3 border-b pb-2 hidden md:block">
        Danh Mục
      </h3>

      {/* Loading */}
      {loading && (
        <div className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-9 w-24 md:w-full bg-slate-100 animate-pulse rounded-xl flex-shrink-0" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {/* List */}
      {!loading && !error && (
        <ul className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 md:overflow-visible md:space-y-1 scrollbar-none">

          {/* All products */}
          <li className="flex-shrink-0">
            <button
              onClick={() => onCategorySelect(null)}
              className={`w-full text-left px-4 py-2 md:px-3 md:py-2 rounded-xl transition whitespace-nowrap text-sm font-semibold ${
                !selectedCategory
                  ? 'bg-brand-600 text-white font-black shadow-md shadow-brand-100'
                  : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              } md:bg-transparent md:border-none md:shadow-none md:hover:bg-gray-50 md:text-gray-600 md:w-full md:rounded-lg ${
                !selectedCategory && 'md:bg-brand-50 md:text-brand-600 md:font-medium'
              }`}
            >
              Tất cả
            </button>
          </li>

          {/* Categories */}
          {filteredCategories.map(cat => (
            <li key={cat.id} className="flex-shrink-0">
              <button
                onClick={() => onCategorySelect(cat.id)}
                className={`w-full text-left px-4 py-2 md:px-3 md:py-2 rounded-xl transition whitespace-nowrap text-sm font-semibold ${
                  selectedCategory === cat.id
                    ? 'bg-brand-600 text-white font-black shadow-md shadow-brand-100'
                    : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                } md:bg-transparent md:border-none md:shadow-none md:hover:bg-gray-50 md:text-gray-600 md:w-full md:rounded-lg ${
                  selectedCategory === cat.id && 'md:bg-brand-50 md:text-brand-600 md:font-medium'
                }`}
              >
                {cat.name}
              </button>
            </li>
          ))}

          {/* empty state */}
          {filteredCategories.length === 0 && (
            <p className="text-sm text-gray-400 px-2 py-2">
              Không tìm thấy danh mục nào
            </p>
          )}
        </ul>
      )}
    </div>
  );
};

export default Sidebar;
