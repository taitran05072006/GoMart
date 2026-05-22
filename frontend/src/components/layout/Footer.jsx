import React from "react";
import { Mail, Phone, MapPin, Facebook, Instagram, Github } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gradient-to-b from-gray-950 to-gray-900 text-gray-300 border-t border-gray-800">

      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">

        {/* BRAND */}
        <div className="space-y-5">
          <h2 className="text-2xl font-extrabold tracking-tight">
            <span className="text-white">TUBA</span>
            <span className="text-brand-400">Mart</span>
          </h2>

          <p className="text-sm text-gray-400 leading-relaxed">
            MiniMart là chuỗi cửa hàng tiện lợi hàng đầu tại Việt Nam, cung cấp đa dạng sản phẩm từ thực phẩm tươi sống, đồ uống, đến các mặt hàng tiêu dùng hàng ngày. Với cam kết chất lượng và dịch vụ tận tâm, MiniMart mang đến trải nghiệm mua sắm nhanh chóng và tiện lợi cho khách hàng trên toàn quốc.
          </p>

          {/* Social */}
          <div className="flex gap-3">
            {[Facebook, Instagram, Github].map((Icon, i) => (
              <div
                key={i}
                className="p-2 bg-gray-800 hover:bg-brand-500 rounded-full cursor-pointer transition"
              >
                <Icon size={16} />
              </div>
            ))}
          </div>
        </div>

        {/* COMPANY */}
        <div>
          <h4 className="text-white font-semibold mb-5">Doanh nghiệp</h4>
          <ul className="space-y-3 text-sm">
            {["About", "Careers", "Blog", "Contact"].map((item) => (
              <li key={item}>
                <a className="hover:text-brand-400 transition" href="#">
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* SUPPORT */}
        <div>
          <h4 className="text-white font-semibold mb-5">Hỗ trợ</h4>
          <ul className="space-y-3 text-sm">
            {["Help Center", "Order Tracking", "Returns", "Shipping"].map(
              (item) => (
                <li key={item}>
                  <a className="hover:text-brand-400 transition" href="#">
                    {item}
                  </a>
                </li>
              )
            )}
          </ul>
        </div>

        {/* CONTACT */}
        <div>
          <h4 className="text-white font-semibold mb-5">Liên hệ</h4>

          <div className="space-y-4 text-sm text-gray-400">

            <div className="flex items-center gap-2">
              <MapPin size={16} /> Da Nang, Vietnam
            </div>

            <div className="flex items-center gap-2">
              <Phone size={16} /> +84 123 456 789
            </div>

            <div className="flex items-center gap-2">
              <Mail size={16} /> support@minimart.com
            </div>

          </div>

          {/* Newsletter */}
          <div className="mt-5 flex rounded-lg overflow-hidden border border-gray-700">
            <input
              type="email"
              placeholder="Your email"
              className="w-full px-3 py-2 bg-gray-800 text-white outline-none"
            />
            <button className="bg-brand-500 hover:bg-brand-600 px-4 text-sm font-medium transition">
              Join
            </button>
          </div>

        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="border-t border-gray-800 py-5 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} TUBAMart
      </div>

    </footer>
  );
};

export default Footer;