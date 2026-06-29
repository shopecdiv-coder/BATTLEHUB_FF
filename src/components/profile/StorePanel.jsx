import React, { useState, useEffect } from "react";
import { Product, UserPurchase } from "@/api/entities";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Gem, Coins, Shirt, CheckCircle2 } from "lucide-react";

export default function StorePanel() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      let list = await Product.list();
      if (list.length === 0) {
        // Seed database if empty
        const sampleProducts = [
          { name: "100 Battlehub Coins", description: "Use coins to enter tournaments", price: 10, category: "virtual", image: "https://api.dicebear.com/7.x/shapes/svg?seed=coins&backgroundColor=ffd700" },
          { name: "500 Diamonds", description: "Premium currency for exclusive items", price: 50, category: "virtual", image: "https://api.dicebear.com/7.x/shapes/svg?seed=diamonds&backgroundColor=00ffff" },
          { name: "VIP Pass (30 Days)", description: "Get priority support and custom badges", price: 299, category: "virtual", image: "https://api.dicebear.com/7.x/shapes/svg?seed=vip&backgroundColor=ff00ff" },
          { name: "Pro Gamer T-Shirt", description: "High-quality cotton tee with Battlehub logo", price: 499, category: "merch", image: "https://api.dicebear.com/7.x/shapes/svg?seed=shirt1" },
          { name: "Battlehub Black Hoodie", description: "Warm and cozy for late night gaming", price: 999, category: "merch", image: "https://api.dicebear.com/7.x/shapes/svg?seed=hoodie" },
          { name: "RGB Mousepad", description: "Large desk mat with RGB lighting", price: 799, category: "merch", image: "https://api.dicebear.com/7.x/shapes/svg?seed=mousepad" },
        ];
        
        for (const p of sampleProducts) {
          await Product.create(p);
        }
        list = await Product.list();
      }
      setProducts(list);
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (product) => {
    setPurchasing(product.id);
    try {
      // Simulate payment delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      await UserPurchase.create({
        user_id: user?.id,
        product_id: product.id,
        product_name: product.name,
        price_paid: product.price,
        status: "completed",
        purchase_date: new Date().toISOString()
      });
      
      setPurchaseSuccess(product.id);
      setTimeout(() => setPurchaseSuccess(null), 3000);
    } catch (err) {
      console.error("Purchase failed:", err);
      alert("Purchase failed. Please try again.");
    } finally {
      setPurchasing(null);
    }
  };

  const virtualItems = products.filter(p => p.category === "virtual");
  const merchItems = products.filter(p => p.category === "merch");

  const renderProductGrid = (items) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          No products available in this category.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(product => (
          <div key={product.id} className="bg-black border border-gray-800 rounded-xl overflow-hidden hover:border-[#00FFFF]/50 transition-colors group flex flex-col">
            <div className="h-40 bg-gray-900 flex items-center justify-center p-4">
              <img src={product.image} alt={product.name} className="max-h-full object-contain group-hover:scale-110 transition-transform duration-300" />
            </div>
            <div className="p-4 flex flex-col flex-1">
              <h3 className="font-bold text-white text-lg">{product.name}</h3>
              <p className="text-xs text-gray-400 mt-1 mb-4 flex-1">{product.description}</p>
              
              <div className="flex items-center justify-between mt-auto">
                <span className="text-xl font-black text-[#00FFFF]">₹{product.price}</span>
                <Button 
                  onClick={() => handleBuy(product)}
                  disabled={purchasing === product.id || purchaseSuccess === product.id}
                  className={`font-bold transition-all ${
                    purchaseSuccess === product.id 
                      ? "bg-green-500 text-white hover:bg-green-600" 
                      : "bg-[#00FFFF] text-black hover:bg-[#00FFFF]/80"
                  }`}
                >
                  {purchasing === product.id ? (
                    <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                  ) : purchaseSuccess === product.id ? (
                    <><CheckCircle2 className="w-4 h-4 mr-1" /> Purchased</>
                  ) : (
                    "Buy Now"
                  )}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-[#0a0a0c] border border-gray-800 rounded-xl p-4 md:p-6 mt-4 animate-in fade-in duration-500 min-h-[500px]">
      <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
        <div className="w-10 h-10 rounded-full bg-[#00FFFF]/10 flex items-center justify-center">
          <ShoppingCart className="w-5 h-5 text-[#00FFFF]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-wider uppercase">Battlehub Store</h2>
          <p className="text-sm text-gray-400">Get exclusive virtual items and premium merchandise.</p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-8 h-8 border-4 border-[#00FFFF] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <Tabs defaultValue="virtual" className="w-full">
          <TabsList className="bg-black/50 border border-gray-800 p-1 mb-6">
            <TabsTrigger value="virtual" className="data-[state=active]:bg-[#00FFFF] data-[state=active]:text-black text-gray-400">
              <Gem className="w-4 h-4 mr-2" />
              Virtual Items
            </TabsTrigger>
            <TabsTrigger value="merch" className="data-[state=active]:bg-[#00FFFF] data-[state=active]:text-black text-gray-400">
              <Shirt className="w-4 h-4 mr-2" />
              Physical Merch
            </TabsTrigger>
          </TabsList>

          <TabsContent value="virtual" className="mt-0">
            {renderProductGrid(virtualItems)}
          </TabsContent>

          <TabsContent value="merch" className="mt-0">
            {renderProductGrid(merchItems)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
