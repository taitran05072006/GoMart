import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { CartContext } from '../../context/CartContext';

const NavbarCart = () => {
  const { cartCount } = useContext(CartContext);

  return (
    <Link to="/cart" className="relative hover:text-yellow-200">
      <ShoppingCart size={24} />
      {cartCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-yellow-400 text-brand-700 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
          {cartCount}
        </span>
      )}
    </Link>
  );
};

export default NavbarCart;