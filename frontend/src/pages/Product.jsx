import React, { useContext, useEffect, useState } from 'react';
import { ProductContext } from '../context/ProductContext';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Pencil, Plus, Search } from 'lucide-react';

const AdminProducts = () => {
  const {
    products,
    loading,
    error,
    fetchProducts,
    deleteProduct, // nếu chưa có thì bạn cần thêm
  } = useContext(ProductContext);

  const [keyword, setKeyword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await deleteProduct(id);
    } catch {
      alert('Delete failed');
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(keyword.toLowerCase())
  );

  if (loading) return <p className="text-center py-10">Loading...</p>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Product Management</h1>

        <button
          onClick={() => navigate('/admin/products/create')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center border rounded-lg px-3 py-2 bg-white shadow-sm">
        <Search size={18} className="text-gray-400 mr-2" />
        <input
          type="text"
          placeholder="Search product..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-full outline-none"
        />
      </div>

      {/* Error */}
      {error && <p className="text-red-500">{error}</p>}

      {/* Table */}
      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-4 text-left">Product</th>
              <th className="p-4 text-center">Price</th>
              <th className="p-4 text-center">Stock</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                {/* Product */}
                <td className="p-4 flex items-center gap-4">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-14 h-14 object-cover rounded-lg"
                  />
                  <div>
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-xs text-gray-500">
                      ID: {product.id}
                    </p>
                  </div>
                </td>

                {/* Price */}
                <td className="p-4 text-center text-red-500 font-bold">
                  {new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND',
                  }).format(product.price)}
                </td>

                <td className="p-4 text-center">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      product.stock > 0
                        ? 'bg-green-100 text-green-600'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {product.stock > 0 ? 'In Stock' : 'Out'}
                  </span>
                </td>

                {/* Actions */}
                <td className="p-4 flex justify-center gap-3">
                  <button
                    onClick={() => navigate(`/admin/products/edit/${product.id}`)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <Pencil size={18} />
                  </button>

                  <button
                    onClick={() => handleDelete(product.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty */}
        {filteredProducts.length === 0 && (
          <p className="text-center py-6 text-gray-500">
            No products found
          </p>
        )}
      </div>
    </div>
  );
};

export default AdminProducts;