import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import ProductCard from '../components/common/ProductCard';
import Spinner from '../components/common/Spinner';
import { AuthContext } from '../context/AuthContext';
import productService from '../services/productService';
import categoryService from '../services/categoryService';

const useQuery = () => new URLSearchParams(useLocation().search);

const ProductList = () => {
  const query = useQuery();
  const navigate = useNavigate();
  const searchKeyword = query.get('search');
  const { user } = useContext(AuthContext);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');

  const [sort, setSort] = useState('asc');

  const location = useLocation();
  const filterProductIds = location.state?.filterProductIds;
  const voucherCode = location.state?.voucherCode;

  // ================= FETCH PRODUCTS =================
  useEffect(() => {
    fetchProducts();
  }, [category, searchKeyword, sort, filterProductIds, user?.storeId]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let res;

      if (searchKeyword) {
        res = await productService.search({ keyword: searchKeyword });
      } else if (category) {
        res = await productService.getByCategory(category);
      } else if (user?.storeId) {
        res = await productService.getByStoreId(user.storeId);
      } else {
        res = await productService.getAll();
      }

      let data = res.data || res;

      // Filter by product IDs if provided (Voucher specific)
      if (filterProductIds && Array.isArray(filterProductIds) && Array.isArray(data)) {
        data = data.filter(p => filterProductIds.includes(p.id));
      }

      // Ẩn các sản phẩm có tồn kho bằng 0
      if (Array.isArray(data)) {
        data = data.filter(p => Number(p.stock || 0) > 0);
      }

      // Sort price locally
      if (Array.isArray(data)) {
        data.sort((a, b) =>
          sort === 'asc' ? a.price - b.price : b.price - a.price
        );
      }

      setProducts(data || []);
    } catch (err) {
      console.error("Lỗi khi fetch sản phẩm", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // ================= FETCH CATEGORY NAME =================
  useEffect(() => {
    const loadCategoryName = async () => {
      if (!category) {
        setCategoryName('');
        return;
      }

      try {
        const res = await categoryService.getById(category);
        const data = res.data || res;
        setCategoryName(data?.name || 'Danh mục');
      } catch (err) {
        console.error("Lỗi khi fetch tên danh mục", err);
        setCategoryName('Danh mục');
      }
    };

    loadCategoryName();
  }, [category]);

  // ================= HANDLE CATEGORY =================
  const handleCategorySelect = (id) => {
    setCategory(id);
    navigate('/products'); // clear search params
  };

  // ================= UI =================
  return (
    <div className="flex flex-col md:flex-row gap-6">

      {/* Sidebar */}
      <div className="w-full md:w-64 flex-shrink-0 md:sticky md:top-24 md:self-start">
        <Sidebar
          onCategorySelect={handleCategorySelect}
          selectedCategory={category}
        />
      </div>

      {/* Main */}
      <div className="flex-grow flex flex-col">

        {/* Header */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center mb-6">

          <h1 className="text-xl font-bold text-gray-800">
            {voucherCode 
              ? `Ưu đãi cho mã: ${voucherCode}`
              : searchKeyword
                ? `Sản phẩm tìm kiếm: "${searchKeyword}"`
                : categoryName || 'Sản phẩm'}
          </h1>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Sắp xếp:</span>
            <select
              className="input-field py-1 px-2 w-auto"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="asc">Thấp đến Cao</option>
              <option value="desc">Cao đến Thấp</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex-grow flex justify-center items-center py-20">
            <Spinner size="lg" />
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map(prod => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        ) : (
          <div className="flex-grow flex flex-col justify-center items-center text-center py-20">
            <div className="text-5xl mb-4">🛒</div>
            <h3 className="text-xl font-bold text-gray-700">
               Không tìm thấy sản phẩm nào
            </h3>
            <p className="text-gray-500">
               Thử điều chỉnh bộ lọc hoặc tìm kiếm từ khóa khác
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default ProductList;
