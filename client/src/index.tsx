import "./index.css";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { SellerAuthProvider } from "./contexts/SellerAuthContext";
import { WishlistProvider } from "./contexts/WishlistContext";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found.");
}

createRoot(rootElement).render(
  <SellerAuthProvider>
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <App />
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  </SellerAuthProvider>,
);
