import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

const NavbarSearch = ({ className = '' }) => {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/products?search=${encodeURIComponent(search)}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className={`flex w-full items-center relative ${className}`}>
      <input
        className="w-full py-2.5 pl-4 pr-10 rounded-2xl bg-white/95 text-slate-900 placeholder:text-slate-400 shadow-sm ring-1 ring-white/30 focus:outline-none focus:ring-4 focus:ring-white/25"
        placeholder="Nhập tên sản phẩm..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <button className="absolute right-1 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-600 hover:bg-slate-100/80">
        <Search size={20} />
      </button>
    </form>
  );
};

export default NavbarSearch;
