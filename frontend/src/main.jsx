import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProductProvider } from './context/ProductContext.jsx'
import { VoucherProvider } from './context/VoucherContext.jsx'
import { PaymentProvider } from './context/PaymentContext.jsx'

const queryClient = new QueryClient();

console.log('Main.jsx is executing...');

window.onerror = function(message, source, lineno, colno, error) {
  console.error('GLOBAL ERROR CAUGHT:', { message, source, lineno, colno, error });
  document.body.innerHTML = `<div style="padding: 20px; color: red; font-family: sans-serif;">
    <h2>Đã xảy ra lỗi khởi động (Runtime Error)</h2>
    <p>Message: ${message}</p>
    <p>Source: ${source}:${lineno}:${colno}</p>
    <pre>${error?.stack || ''}</pre>
  </div>`;
  return false;
};

window.onunhandledrejection = function(event) {
  console.error('UNHANDLED REJECTION:', event.reason);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ProductProvider>
        <NotificationProvider>
          <CartProvider>
            <VoucherProvider>
              <PaymentProvider>
                <QueryClientProvider client={queryClient}>
                  <App />
                  <Toaster position="top-right" />
                </QueryClientProvider>
              </PaymentProvider>
            </VoucherProvider>
          </CartProvider>
        </NotificationProvider>
      </ProductProvider>
    </AuthProvider>
  </React.StrictMode>,
)
