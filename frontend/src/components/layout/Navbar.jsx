import React from 'react';
import { Link } from 'react-router-dom';
import NavbarSearch from '../../components/common/NavbarSearch';
import NavbarCart from '../../components/common/NavbarCart';
import NavbarNotifications from '../common/navbarNotifications';
import NavbarUserMenu from '../../components/common/NavbarUserMenu';

const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 border-b border-white/25 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-700 text-white shadow-[0_18px_40px_rgba(2,6,23,0.18)]">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center justify-between gap-4">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 rounded-2xl px-3 py-2 transition hover:bg-white/10">
            <span className="text-2xl font-black tracking-tight heading-display">TUBA</span>
            <span className="text-2xl font-black tracking-tight text-amber-300 heading-display">Mart</span>
          </Link>

          {/* Search */}
          <div className="hidden w-full max-w-xl md:block">
            <NavbarSearch className="mx-auto max-w-xl" />
          </div>

          {/* Right section */}
          <div className="flex items-center gap-3 sm:gap-5">
            <NavbarCart />
            <NavbarNotifications />
            <NavbarUserMenu />
          </div>

        </div>
        <div className="mt-3 md:hidden">
          <NavbarSearch />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
