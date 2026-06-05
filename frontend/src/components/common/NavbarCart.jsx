import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { CartContext } from '../../context/CartContext';
import { AuthContext } from '../../context/AuthContext';
import { AUTH_REDIRECT_EVENT } from '../../api/axiosClient';

const NavbarCart = () => {
  const { cartCount } = useContext(CartContext);
  const { user } = useContext(AuthContext);

  const handleClick = (e) => {
    if (!user) {
      e.preventDefault();
      window.dispatchEvent(new Event(AUTH_REDIRECT_EVENT));
    }
  };

  return (
    <Link to="/cart" onClick={handleClick} className="relative hover:text-yellow-200">
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