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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full">

      {/* Header */}
      <h3 className="font-bold text-gray-800 uppercase tracking-wider mb-3 border-b pb-2">
        Danh Mục
      </h3>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-8 bg-gray-100 animate-pulse rounded-lg" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      {/* List */}
      {!loading && !error && (
        <ul className="space-y-1">

          {/* All products */}
          <li>
            <button
              onClick={() => onCategorySelect(null)}
              className={`w-full text-left px-3 py-2 rounded-lg transition ${
                !selectedCategory
                  ? 'bg-brand-50 text-brand-600 font-medium'
                  : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
            Sản phẩm
            </button>
          </li>

          {/* Categories */}
          {filteredCategories.map(cat => (
            <li key={cat.id}>
              <button
                onClick={() => onCategorySelect(cat.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition ${
                  selectedCategory === cat.id
                    ? 'bg-brand-50 text-brand-600 font-medium'
                    : 'hover:bg-gray-50 text-gray-600'
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