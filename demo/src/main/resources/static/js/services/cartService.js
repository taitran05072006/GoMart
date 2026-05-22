let cart = JSON.parse(localStorage.getItem("gm_cart") || "[]");
let wishlist = JSON.parse(localStorage.getItem("gm_wishlist") || "[]");

export const cartService = {
    getCart: () => cart,
    getWishlist: () => wishlist,
    saveCart: () => localStorage.setItem("gm_cart", JSON.stringify(cart)),
    saveWishlist: () => localStorage.setItem("gm_wishlist", JSON.stringify(wishlist)),
    
    addToCart: (product, qty = 1) => {
        const existing = cart.find((c) => c.id === product.id);
        if (existing) {
            existing.qty += qty;
        } else {
            // we copy necessary fields
            const cartItem = {
                id: product.id,
                name: product.name,
                emoji: product.emoji,
                bg: product.bg,
                price: product.price,
                unit: product.unit,
                qty: qty
            };
            cart.push(cartItem);
        }
        cartService.saveCart();
    },
    removeFromCart: (productId) => {
        cart = cart.filter(c => c.id !== productId);
        cartService.saveCart();
    },
    updateQty: (productId, delta) => {
        const item = cart.find(c => c.id === productId);
        if (item) {
            item.qty += delta;
            if (item.qty <= 0) {
                cart = cart.filter(c => c.id !== productId);
            }
            cartService.saveCart();
        }
    },
    clearCart: () => {
        cart = [];
        cartService.saveCart();
    },
    toggleWishlist: (productId) => {
        if (wishlist.includes(productId)) {
            wishlist = wishlist.filter(id => id !== productId);
        } else {
            wishlist.push(productId);
        }
        cartService.saveWishlist();
        return wishlist.includes(productId);
    }
};
