import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Product, UserPurchase, UserAddress, UserOrder, UserWishlist, SellRequest, LegalContent, StoreBanner, ProductReview } from "@/api/entities";
import { useNavigate } from "react-router-dom";
import { AppSettings } from "@/entities/AppSettings";
import { UploadFile } from "@/integrations/Core";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ShoppingCart, Search, ArrowLeft, Star, Heart, CheckCircle2, Package, Percent, Monitor, Gift, Gem, ChevronRight, ChevronLeft, X, Trash2, Plus, Minus, CreditCard, Home, LayoutGrid, ShoppingBag, UserCircle, Settings, FileText, Bell, Lock, HelpCircle, LogOut, Shield, Truck, MapPin, Download, Headset, CheckCircle, Map, RefreshCcw, Store, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import BHTVPlayer from "@/components/ui/BHTVPlayer";

const CATEGORIES = [
  { id: 'merch', name: 'Merchandise', icon: Package, count: '120+', image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500&q=80" },
  { id: 'gear', name: 'Gaming Gear', icon: Monitor, count: '45+', image: "https://images.unsplash.com/photo-1615663245857-ac93bb7c3c9c?w=500&q=80" },
  { id: 'coins', name: 'BattleHub Coins', icon: Gem, count: '6 Packs', image: "https://images.unsplash.com/photo-1621504450181-5d356f61d307?w=500&q=80" },
  { id: 'pass', name: 'Tournament Pass', icon: Star, count: '3 Types', image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&q=80" },
  { id: 'giftcards', name: 'Gift Cards', icon: Gift, count: '15+', image: "https://images.unsplash.com/photo-1606159068539-43f36b99d1b2?w=500&q=80" },
  { id: 'accessories', name: 'Accessories', icon: Package, count: '85+', image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500&q=80" },
];

// BANNERS is now dynamic from Firestore

export default function StoreDrawer({ isOpen, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState("");
  
  // Main Tab State
  const [activeTab, setActiveTab] = useState('home');
  const [accountView, setAccountView] = useState('main');

  // Cart State
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('cart'); // 'cart' | 'address' | 'payment'
  const [selectedAddressId, setSelectedAddressId] = useState(null);

  // Addresses State
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({ name: '', phone: '', street: '', city: '', state: '', pincode: '' });

  // Purchase History State
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [cancelHoldProgress, setCancelHoldProgress] = useState(0);
  const [showInvoice, setShowInvoice] = useState(false);

  // Wishlist State
  const [wishlistItems, setWishlistItems] = useState([]);

  // Sell & Seller State
  const [sellForm, setSellForm] = useState({ name: '', category: '', expectedPrice: '', description: '', images: [] });
  const [isSeller, setIsSeller] = useState(false);
  const [sellerRegForm, setSellerRegForm] = useState({ shopName: '', phone: '', agreed: false });
  const [showSellerTerms, setShowSellerTerms] = useState(false);

  // Dynamic Policies & Settings
  const [dynamicPolicies, setDynamicPolicies] = useState({});
  const [enableSellerOnboarding, setEnableSellerOnboarding] = useState(true);

  // Dynamic Banners & Settings
  const [storeBanners, setStoreBanners] = useState([]);
  const [storePaymentMethod, setStorePaymentMethod] = useState('both'); // 'both' | 'online' | 'cod'
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('online');

  // Product Detail State
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Reviews State
  const [productReviews, setProductReviews] = useState([]);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ id: null, rating: 5, text: '', images: [] });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  // Banner State
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const touchStartX = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (storeBanners.length === 0) return;
    if (diff > 50) {
      // Swipe left (next banner)
      setActiveBannerIndex((prev) => (prev + 1) % storeBanners.length);
    } else if (diff < -50) {
      // Swipe right (prev banner)
      setActiveBannerIndex((prev) => (prev - 1 + storeBanners.length) % storeBanners.length);
    }
  };

  useEffect(() => {
    let interval;
    if (isOpen && activeCategory === 'all' && searchQuery === '' && storeBanners.length > 0) {
      interval = setInterval(() => {
        setActiveBannerIndex((prev) => (prev + 1) % storeBanners.length);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isOpen, activeCategory, searchQuery, storeBanners.length]);

  useEffect(() => {
    if (!cartOpen) {
      setCheckoutStep('cart');
    }
  }, [cartOpen]);

  useEffect(() => {
    if (isOpen) {
      loadProducts();
      loadLegalDocs();
      loadBanners();
      if (user?.id) {
        loadUserStoreData();
      }
      loadPaymentSettings();
    }
  }, [isOpen, user?.id]);

  const loadPaymentSettings = async () => {
    try {
      const setting = await AppSettings.filter({ setting_key: "store_payment_method" }).catch(() => []);
      if (setting && setting.length > 0) {
        setStorePaymentMethod(setting[0].setting_value || 'both');
        if (setting[0].setting_value === 'cod') setSelectedPaymentMode('cod');
      }
    } catch (err) {
      console.error("Failed to load payment settings", err);
    }
  };

  const loadBanners = async () => {
    try {
      const bns = await StoreBanner.list('-created_date', 5);
      if (bns && bns.length > 0) {
        setStoreBanners(bns);
      } else {
        // Fallback to empty if none exist
        setStoreBanners([]);
      }
    } catch (err) {
      console.error("Failed to load banners:", err);
    }
  };

  const loadUserStoreData = async () => {
    try {
      if (!user?.id) return;
      const addresses = await UserAddress.filter({ user_id: user.id }, '-created_date');
      if (addresses) {
        setSavedAddresses(addresses);
      }
      
      const orders = await UserOrder.filter({ user_id: user.id }, '-created_date');
      if (orders) {
        setPurchaseHistory(orders);
      }

      const wishlist = await UserWishlist.filter({ user_id: user.id }, '-created_date');
      if (wishlist) {
        setWishlistItems(wishlist);
      }
    } catch (err) {
      console.error("Error loading user store data:", err);
    }
  };

  const loadLegalDocs = async () => {
    try {
      const [docs, onboardingSet] = await Promise.all([
        LegalContent.list(),
        AppSettings.filter({ setting_key: "enable_seller_onboarding" }).catch(() => [])
      ]);
      const docsMap = {};
      (docs || []).forEach(d => { docsMap[d.content_type] = d; });
      setDynamicPolicies(docsMap);
      
      if (onboardingSet && onboardingSet.length > 0) {
        setEnableSellerOnboarding(onboardingSet[0].setting_value === 'true');
      }
    } catch (err) {
      console.error("Failed to load legal docs or settings:", err);
    }
  };

  const toggleWishlist = async (e, product) => {
    e.stopPropagation();
    if (!user?.id) {
      toast.error("Please login to use wishlist");
      return;
    }
    const existing = wishlistItems.find(item => item.product_id === product.id);
    if (existing) {
      try {
        await UserWishlist.delete(existing.id);
        setWishlistItems(prev => prev.filter(item => item.id !== existing.id));
        toast.success("Removed from wishlist");
      } catch (err) {
        toast.error("Failed to remove from wishlist");
      }
    } else {
      try {
        const newItem = await UserWishlist.create({
          user_id: user.id,
          product_id: product.id,
          product_name: product.name,
          price: product.price,
          originalPrice: product.originalPrice,
          image: product.image
        });
        setWishlistItems(prev => [newItem, ...prev]);
        toast.success("Added to wishlist");
      } catch (err) {
        toast.error("Failed to add to wishlist");
      }
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      let list = await Product.list();
      
      const hasOldCategories = list.some(p => p.category === 'virtual' || p.category === 'giftcards');
      
      if (list.length === 0 || hasOldCategories) {
        if (hasOldCategories) {
          for (const p of list) {
            await Product.delete(p.id);
          }
        }
        
        // Seed database if empty or wiped
        const sampleProducts = [
          // Merchandise
          { name: "Battlehub Classic T-Shirt", description: "Premium cotton black tee with logo", price: 499, originalPrice: 999, category: "merch", image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=2000&auto=format&fit=crop", rating: 4.8, reviews: 120 },
          { name: "Psycho Shayar Special Tee", description: "Limited edition creator merchandise", price: 599, originalPrice: 799, category: "merch", creator: "Psycho Shayar", image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=2000&auto=format&fit=crop", rating: 4.9, reviews: 342 },
          { name: "Deadshot Gaming Jersey", description: "Official esports jersey by Deadshot", price: 899, originalPrice: 1499, category: "merch", creator: "Deadshot", image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=2000&auto=format&fit=crop", rating: 4.7, reviews: 89 },
          
          // Gaming Gear
          { name: "RGB Extended Mousepad", description: "Large desk mat with RGB lighting", price: 799, originalPrice: 1599, category: "gear", image: "https://images.unsplash.com/photo-1615663245857-ac93bb7c3c9c?q=80&w=2000&auto=format&fit=crop", rating: 4.6, reviews: 54 },
          { name: "Pro Gaming Headset", description: "7.1 surround sound esports headset", price: 2499, originalPrice: 4999, category: "gear", image: "https://images.unsplash.com/photo-1599669500515-b3e1f588c946?q=80&w=2000&auto=format&fit=crop", rating: 4.5, reviews: 211 },

          // BattleHub Coins
          { name: "100 Battle Coins", description: "In-game currency for tournaments", price: 80, originalPrice: 100, category: "coins", image: "https://cdn-icons-png.flaticon.com/512/825/825501.png", rating: 5.0, reviews: 999 },
          { name: "500 Battle Coins + 50 Bonus", description: "Special value pack", price: 400, originalPrice: 500, category: "coins", image: "https://cdn-icons-png.flaticon.com/512/825/825501.png", rating: 4.9, reviews: 843 },

          // Tournament Pass
          { name: "Elite Pass - Season 5", description: "Unlock premium rewards & free entries", price: 299, originalPrice: 499, category: "pass", image: "https://cdn-icons-png.flaticon.com/512/1039/1039401.png", rating: 4.8, reviews: 567 },
          
          // Gift Cards
          { name: "Google Play Card ₹500", description: "Instant delivery code", price: 500, originalPrice: 500, category: "giftcards", image: "https://cdn-icons-png.flaticon.com/512/888/888849.png", rating: 4.9, reviews: 1200 },
          
          // Accessories
          { name: "Gamer Grip Gloves", description: "Anti-sweat gaming gloves", price: 299, originalPrice: 599, category: "accessories", image: "https://images.unsplash.com/photo-1517404215738-15263e9f9178?q=80&w=2000&auto=format&fit=crop", rating: 4.4, reviews: 34 },
          { name: "Battlehub Coffee Mug", description: "Ceramic mug for your energy drinks", price: 249, originalPrice: 499, category: "accessories", image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?q=80&w=2000&auto=format&fit=crop", rating: 4.7, reviews: 76 },
        ];
        
        for (const p of sampleProducts) {
          await Product.create(p);
        }
        list = await Product.list();
      }
      
      // Augment products with dummy MRP and ratings if missing
      const augmented = list.map(p => ({
        ...p,
        originalPrice: p.originalPrice || Math.floor(p.price * 1.4),
        rating: p.rating || (Math.random() * (5.0 - 4.0) + 4.0).toFixed(1),
        reviews: p.reviews || Math.floor(Math.random() * 800) + 120,
      }));
      
      setProducts(augmented);
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  useEffect(() => {
    loadUserStoreData();
  }, [user]);

  useEffect(() => {
    if (selectedProduct) {
      loadReviews(selectedProduct.id);
      setIsDescriptionExpanded(false);
      setShowReviewForm(false);
      setReviewForm({ id: null, rating: 5, text: '', images: [] });
    }
  }, [selectedProduct]);

  const loadReviews = async (productId) => {
    try {
      const revs = await ProductReview.filter({ product_id: productId }, '-created_date');
      setProductReviews(revs || []);
    } catch (err) {
      console.error("Failed to load reviews:", err);
    }
  };

  const submitReview = async () => {
    if (!reviewForm.text.trim()) {
      toast.error("Please write a review");
      return;
    }
    setIsSubmittingReview(true);
    try {
      if (reviewForm.id) {
        await ProductReview.update(reviewForm.id, {
          rating: reviewForm.rating,
          text: reviewForm.text,
          images: reviewForm.images,
          updated_date: new Date().toISOString()
        });
        toast.success("Review updated!");
      } else {
        await ProductReview.create({
          product_id: selectedProduct.id,
          user_id: user?.id,
          user_name: user?.name || "BATTLEHUB User",
          user_avatar: user?.avatar || "",
          rating: reviewForm.rating,
          text: reviewForm.text,
          images: reviewForm.images,
          created_date: new Date().toISOString()
        });
        toast.success("Review submitted!");
      }
      
      setShowReviewForm(false);
      setReviewForm({ id: null, rating: 5, text: '', images: [] });
      loadReviews(selectedProduct.id);
      
      const allRevs = await ProductReview.filter({ product_id: selectedProduct.id });
      if (allRevs && allRevs.length > 0) {
        const avg = allRevs.reduce((acc, r) => acc + r.rating, 0) / allRevs.length;
        await Product.update(selectedProduct.id, {
          rating: parseFloat(avg.toFixed(1)),
          reviews: allRevs.length
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit review");
    }
    setIsSubmittingReview(false);
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    toast.success(`${product.name} added to cart`);
  };

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        if (newQ < 1) return item;
        return { ...item, quantity: newQ };
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartOriginalTotal = cart.reduce((sum, item) => sum + (item.originalPrice * item.quantity), 0);
  const totalDiscount = cartOriginalTotal - cartTotal;

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (document.getElementById("razorpay-script")) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (mode = 'online') => {
    setIsCheckingOut(true);
    
    if (mode === 'cod') {
      try {
        const selectedAddr = savedAddresses.find(a => a.id === selectedAddressId) || savedAddresses.find(a => a.isDefault) || savedAddresses[0];
        
        for (const item of cart) {
          await UserPurchase.create({
            user_id: user?.id,
            product_id: item.id,
            product_name: item.name,
            price_paid: item.price * item.quantity,
            status: "pending",
            purchase_date: new Date().toISOString()
          });
        }
        
        const newOrderData = {
          user_id: user?.id,
          id: `ORD-${Math.floor(Math.random() * 900000) + 100000}`,
          date: new Date().toLocaleDateString(),
          total: cartTotal,
          status: "Processing",
          items: cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, price: item.price, image: item.image })),
          shipping_address: selectedAddr,
          transaction_id: "COD",
          payment_method: "Cash on Delivery"
        };
        
        const savedOrder = await UserOrder.create(newOrderData);
        setPurchaseHistory(prev => [savedOrder, ...prev]);
        
        setCart([]);
        setCheckoutStep('cart');
        setCartOpen(false);
        toast.success("Order placed successfully via Cash on Delivery! 🎉");
      } catch (err) {
        console.error("COD Order creation failed:", err);
        toast.error("Order failed. Please try again.");
      }
      setIsCheckingOut(false);
      return;
    }

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      toast.error("Payment gateway failed to load. Check your internet connection.");
      setIsCheckingOut(false);
      return;
    }

    const options = {
      key: "rzp_live_SMD4oloMldhyzx",
      amount: cartTotal * 100, // in paise
      currency: "INR",
      name: "BATTLEHUB STORE",
      description: `Order of ₹${cartTotal}`,
      image: "https://api.dicebear.com/6.x/bottts/svg?seed=battlehub",
      handler: async function (response) {
        try {
          const selectedAddr = savedAddresses.find(a => a.id === selectedAddressId) || savedAddresses.find(a => a.isDefault) || savedAddresses[0];
          
          for (const item of cart) {
            await UserPurchase.create({
              user_id: user?.id,
              product_id: item.id,
              product_name: item.name,
              price_paid: item.price * item.quantity,
              status: "completed",
              purchase_date: new Date().toISOString()
            });
          }
          
          const newOrderData = {
            user_id: user?.id,
            id: `ORD-${Math.floor(Math.random() * 900000) + 100000}`,
            date: new Date().toLocaleDateString(),
            total: cartTotal,
            status: "Processing",
            items: cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, price: item.price, image: item.image })),
            shipping_address: selectedAddr,
            transaction_id: response.razorpay_payment_id,
            payment_method: "Online"
          };
          
          const savedOrder = await UserOrder.create(newOrderData);
          setPurchaseHistory(prev => [savedOrder, ...prev]);
          
          setCart([]);
          setCheckoutStep('cart');
          setCartOpen(false);
          toast.success("Order placed successfully! 🎉");
        } catch (err) {
          console.error("Order creation failed:", err);
          toast.error("Payment done but order failed. Contact support with ID: " + response.razorpay_payment_id);
        }
        setIsCheckingOut(false);
      },
      prefill: {
        name: user?.full_name || user?.ign || "",
        email: user?.email || "",
        contact: user?.phone || user?.mobile_number || ""
      },
      theme: {
        color: "#00FFFF"
      },
      modal: {
        ondismiss: function () {
          setIsCheckingOut(false);
          toast.error("Payment cancelled.");
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function (response) {
      toast.error("Payment failed: " + response.error.description);
      setIsCheckingOut(false);
    });

    rzp.open();
  };

  const handleCancelOrder = async (orderId) => {
    try {
      await UserOrder.update(orderId, { status: 'Cancelled' });
      setPurchaseHistory(prev => prev.map(order => order.id === orderId ? { ...order, status: 'Cancelled' } : order));
      toast.success("Order cancelled successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to cancel order");
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setCheckoutStep('address');
  };

  const renderCategories = () => (
    <div className="p-4 pb-24">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {CATEGORIES.map(cat => (
          <div 
            key={cat.id} 
            onClick={() => { setActiveCategory(cat.id); setActiveTab('home'); }} 
            className="bg-slate-900 border border-gray-800 rounded-xl overflow-hidden cursor-pointer hover:border-[#00FFFF]/50 hover:shadow-[0_0_15px_rgba(0,255,255,0.15)] transition-all group flex flex-col h-full"
          >
            <div className="relative h-32 sm:h-40 w-full overflow-hidden bg-slate-800">
              <img src={cat.image} alt={cat.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent"></div>
              <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md p-1.5 rounded-lg border border-white/10">
                <cat.icon className="w-4 h-4 text-[#00FFFF]" />
              </div>
            </div>
            <div className="p-3 bg-slate-900">
              <h3 className="text-white font-bold text-sm sm:text-base leading-tight group-hover:text-[#00FFFF] transition-colors">{cat.name}</h3>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-1 font-medium">{cat.count} Products</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const HoldToCancelButton = ({ onCancel }) => {
    const [progress, setProgress] = useState(0);
    const holdTimer = useRef(null);
    const intervalTimer = useRef(null);
    const duration = 3000;

    const startHold = (e) => {
      // Prevent default to stop scrolling/selection on mobile
      if(e.cancelable) e.preventDefault();
      setProgress(0);
      const startTime = Date.now();
      
      intervalTimer.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const p = Math.min((elapsed / duration) * 100, 100);
        setProgress(p);
        if (p >= 100) {
          clearInterval(intervalTimer.current);
        }
      }, 50);

      holdTimer.current = setTimeout(() => {
        onCancel();
        stopHold();
      }, duration);
    };

    const stopHold = () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      if (intervalTimer.current) clearInterval(intervalTimer.current);
      setProgress(0);
    };

    return (
      <Button 
        variant="ghost" 
        size="sm"
        onPointerDown={startHold}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onContextMenu={(e) => e.preventDefault()}
        className="flex-1 relative overflow-hidden bg-slate-900 border border-red-500/20 text-red-400 hover:text-red-300 hover:bg-slate-900 h-10 font-bold uppercase tracking-wider text-[10px] sm:text-xs select-none touch-none"
      >
        <div 
          className="absolute left-0 top-0 bottom-0 bg-red-500/20 transition-all ease-linear"
          style={{ width: `${progress}%`, transitionDuration: progress === 0 ? '0ms' : '50ms' }}
        />
        <span className="relative z-10">{progress > 0 ? 'Keep holding...' : 'Hold 3s to Cancel'}</span>
      </Button>
    );
  };

  const renderOrders = () => {
    if (selectedOrderDetails) {
      const order = selectedOrderDetails;
      return (
        <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
          <div className="p-4 border-b border-gray-800 flex items-center gap-3 sticky top-0 bg-black/95 backdrop-blur z-10">
            <button 
              onClick={() => setSelectedOrderDetails(null)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h2 className="text-lg font-black text-white uppercase tracking-wider">Order Details</h2>
          </div>
          
          <div className="flex-1 p-4 pb-32 space-y-4 overflow-y-auto hide-scrollbar">
            {/* 1. Order Status Timeline */}
            <div className="bg-slate-900 border border-gray-800 rounded-xl p-4 shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wider">Order Status</h3>
              <div className="relative pl-4">
                <div className="absolute left-[27px] top-4 bottom-6 w-[2px] bg-gray-800"></div>
                <div className="space-y-4 relative">
                  <div className="flex items-center gap-4 opacity-100">
                    <div className="w-7 h-7 rounded-full bg-[#00FFFF] flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(0,255,255,0.3)] z-10">
                      <CheckCircle2 className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Order Placed</p>
                      <p className="text-[10px] text-gray-500">{order.created_date ? new Date(order.created_date).toLocaleDateString() : (order.date || 'N/A')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 opacity-100">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${order.status === 'Processing' ? 'bg-slate-800 border-2 border-gray-600' : 'bg-[#00FFFF] shadow-[0_0_10px_rgba(0,255,255,0.3)]'}`}>
                      {order.status !== 'Processing' ? <CheckCircle2 className="w-4 h-4 text-black" /> : <div className="w-2 h-2 rounded-full bg-gray-400"></div>}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${order.status !== 'Processing' ? 'text-white' : 'text-gray-400'}`}>Confirmed</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 opacity-50">
                    <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-gray-700 flex items-center justify-center shrink-0 z-10">
                       <Package className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-400">Packed</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 opacity-50">
                    <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-gray-700 flex items-center justify-center shrink-0 z-10">
                       <Truck className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-400">Shipped</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 opacity-50">
                    <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-gray-700 flex items-center justify-center shrink-0 z-10">
                       <Home className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-400">Delivered</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Order Summary Card */}
            <div className="bg-slate-900 border border-gray-800 rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Order #</p>
                  <p className="text-sm font-bold text-white font-mono">{order.id}</p>
                </div>
                <Badge className="bg-[#00FFFF]/20 text-[#00FFFF] border-none text-[10px]">{order.status}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-0.5">Placed on</p>
                  <p className="text-xs font-medium text-gray-300">{order.created_date ? new Date(order.created_date).toLocaleDateString() : (order.date || 'N/A')}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-0.5">Payment</p>
                  <p className="text-xs font-medium text-gray-300">{order.payment_method || 'Paid via UPI'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-0.5">Estimated Delivery</p>
                  <p className="text-xs font-bold text-[#00FFFF]">TBD</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-0.5">Total</p>
                  <p className="text-sm font-black text-[#00FFFF]">₹{order.total}</p>
                </div>
              </div>
            </div>

            {/* 3. Shipping Address */}
            <div className="bg-slate-900 border border-gray-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-[#00FFFF]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Delivery Address</h3>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-gray-800/50">
                <p className="text-sm font-bold text-white mb-1">{order.shipping_address?.name || user?.displayName || 'User'}</p>
                <p className="text-xs text-gray-400 mb-2">+91 {order.shipping_address?.phone || user?.phone || 'XXXXX XXXXX'}</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {order.shipping_address?.street || 'Not provided'},<br/>
                  {order.shipping_address?.city || ''} {order.shipping_address?.state ? `, ${order.shipping_address.state}` : ''} {order.shipping_address?.pincode ? `- ${order.shipping_address.pincode}` : ''}
                </p>
              </div>
            </div>

            {/* 4. Item Details */}
            <div className="bg-slate-900 border border-gray-800 rounded-xl overflow-hidden shadow-sm">
              <div className="p-3 bg-slate-800/50 border-b border-gray-800">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Item Details</p>
              </div>
              <div className="p-4 space-y-4">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="w-20 h-20 rounded-lg bg-black p-1 overflow-hidden shrink-0 border border-gray-800 flex items-center justify-center">
                      <img src={item.image} alt={item.name} className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white leading-tight mb-1">{item.name}</h4>
                        <div className="flex gap-3 text-[10px] text-gray-400 font-medium">
                          <span>Qty: {item.quantity}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-sm font-black text-white">₹{item.price}</p>
                        <p className="text-[10px] font-medium text-green-400 flex items-center gap-1"><RefreshCcw className="w-3 h-3"/> 7 Days Return</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Price Breakdown */}
            <div className="bg-slate-900 border border-gray-800 rounded-xl p-4 space-y-3 shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Price Breakdown</h3>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white font-medium">₹{order.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Delivery</span>
                <span className="text-green-400 font-medium">FREE</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Discount</span>
                <span className="text-green-400 font-medium">-₹0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">GST</span>
                <span className="text-white font-medium">Included</span>
              </div>
              <div className="border-t border-gray-800 pt-3 mt-1 flex justify-between items-center">
                <span className="text-sm font-bold text-white uppercase tracking-wider">Total</span>
                <span className="text-lg font-black text-[#00FFFF]">₹{order.total}</span>
              </div>
            </div>

            {/* 6. Tracking Details */}
            <div className="bg-slate-900 border border-gray-800 rounded-xl p-4 shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Tracking Details</h3>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-gray-800/50 flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center p-1">
                    <Truck className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Tracking ID</p>
                    <p className="text-sm font-bold text-white">Pending</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Expected</p>
                  <p className="text-sm font-bold text-[#00FFFF]">TBD</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={() => toast.info("Tracking link will be provided")}
                className="w-full bg-transparent border-[#00FFFF]/30 text-[#00FFFF] hover:bg-[#00FFFF]/10 h-10 font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2"
              >
                Track Order <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* 7. Payment Details */}
            <div className="bg-slate-900 border border-gray-800 rounded-xl p-4 shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Payment Details</h3>
              <div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-gray-800/50 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white uppercase">{order.payment_method === 'Cash on Delivery' ? 'COD' : 'UPI'}</p>
                    <p className="text-[10px] text-gray-400 font-mono">TXN: {order.transaction_id || 'N/A'}</p>
                  </div>
                </div>
                <Badge className={`${order.payment_method === 'Cash on Delivery' && order.status !== 'Delivered' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'} border-none text-[10px]`}>
                  {order.payment_method === 'Cash on Delivery' && order.status !== 'Delivered' ? 'Pending' : 'Paid'}
                </Badge>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowInvoice(true)}
                className="w-full bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white h-10 font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" /> Download Invoice
              </Button>
            </div>

            {/* 8. Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => toast.info("Tracking link will be provided")}
                className={`bg-transparent border-[#00FFFF]/30 text-[#00FFFF] hover:bg-[#00FFFF]/10 h-10 font-bold uppercase tracking-wider text-[10px] sm:text-xs ${order.status !== 'Processing' ? 'col-span-2' : ''}`}
              >
                <Truck className="w-3.5 h-3.5 mr-2" /> Track Order
              </Button>
              {order.status === 'Processing' && (
                <HoldToCancelButton 
                  onCancel={() => {
                    handleCancelOrder(order.id);
                    setSelectedOrderDetails(null);
                  }} 
                />
              )}
            </div>

            {/* 9. Recommended Products */}
            <div className="pt-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-[#00FFFF] fill-[#00FFFF]" /> You May Also Like
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {products.slice(0, 6).map((p, i) => {
                  const discount = p.originalPrice > p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;
                  return (
                    <div key={i} className="bg-slate-900 border border-gray-800 rounded-xl overflow-hidden cursor-pointer hover:border-gray-600 transition-colors flex flex-col h-full" onClick={() => { setSelectedOrderDetails(null); setSelectedProduct(p); }}>
                      <div className="aspect-square bg-slate-800/30 p-2 flex items-center justify-center relative">
                        {discount > 0 && (
                          <div className="absolute top-2 left-2 bg-[#2ecc71] text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-sm z-10">
                            {discount}% OFF
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-slate-950 text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-sm z-10 flex items-center gap-0.5">
                          {p.rating || '4.5'} <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-400 fill-yellow-400" />
                        </div>
                        <img src={p.images?.[0] || p.image} className="max-w-full max-h-full object-contain mix-blend-normal" alt={p.name} />
                      </div>
                      <div className="p-2 sm:p-3 flex-1 flex flex-col justify-between">
                        <p className="text-[10px] sm:text-xs font-bold text-gray-200 line-clamp-2 leading-tight">{p.name}</p>
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-white">₹{p.price}</span>
                          {p.originalPrice > p.price && (
                            <span className="text-[9px] sm:text-[10px] text-gray-500 line-through">₹{p.originalPrice}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      );
    }

    const activeOrders = purchaseHistory.filter(order => order.status !== 'Delivered' && order.status !== 'Cancelled');
    
    if (activeOrders.length === 0) {
      return (
        <div className="p-4 pb-24 flex flex-col items-center justify-center h-full text-center mt-10">
          <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-gray-800">
            <ShoppingBag className="w-10 h-10 text-gray-600" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Active Orders</h3>
          <p className="text-gray-500 text-sm max-w-[250px] mx-auto">Looks like you haven't placed any orders yet. Start exploring our store!</p>
          <Button onClick={() => setActiveTab('home')} className="mt-8 bg-[#00FFFF] hover:bg-[#00FFFF]/80 text-black font-bold px-8">Start Shopping</Button>
        </div>
      );
    }

    return (
      <div className="p-4 pb-24 space-y-4">
        {activeOrders.map(order => (
          <div 
            key={order.id} 
            className="bg-slate-900 border border-gray-800 rounded-xl overflow-hidden shadow-sm cursor-pointer hover:border-gray-600 transition-colors group"
            onClick={() => setSelectedOrderDetails(order)}
          >
            <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-slate-800/30">
              <div>
                <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-bold mb-0.5">Order ID</p>
                <p className="text-xs sm:text-sm font-bold text-white font-mono group-hover:text-[#00FFFF] transition-colors">{order.id}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-bold mb-0.5">Status</p>
                <Badge className="bg-[#00FFFF]/20 text-[#00FFFF] border-none text-[10px]">{order.status}</Badge>
              </div>
            </div>
            <div className="p-4 space-y-4">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex gap-3 sm:gap-4 items-center">
                  <div className="w-12 h-12 rounded-lg bg-black p-1 overflow-hidden shrink-0 border border-gray-800 flex items-center justify-center">
                    <img src={item.image} alt={item.name} className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-white line-clamp-1">{item.name}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-white">₹{item.price}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between bg-slate-900/50">
              <div>
                <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-bold mb-0.5">Total Amount</p>
                <p className="text-sm sm:text-base font-black text-white">₹{order.total}</p>
              </div>
              <div className="flex items-center gap-1 text-[#00FFFF] text-xs font-bold uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                View Details <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderAccount = () => {

    if (accountView === 'addresses') {
      const handleSaveAddress = async (e) => {
        e.preventDefault();
        if (!newAddress.name || !newAddress.phone || !newAddress.street || !newAddress.city || !newAddress.state || !newAddress.pincode) {
          toast.error("Please fill all fields");
          return;
        }
        try {
          const isDefault = savedAddresses.length === 0;
          const addrToSave = { ...newAddress, user_id: user?.id, isDefault };
          const savedAddr = await UserAddress.create(addrToSave);
          setSavedAddresses(prev => [...prev, savedAddr]);
          setIsAddingAddress(false);
          setNewAddress({ name: '', phone: '', street: '', city: '', state: '', pincode: '' });
          toast.success("Address saved successfully!");
        } catch (err) {
          console.error(err);
          toast.error("Failed to save address");
        }
      };

      const handleRemoveAddress = async (id) => {
        try {
          await UserAddress.delete(id);
          setSavedAddresses(prev => prev.filter(addr => addr.id !== id));
          toast.success("Address removed");
        } catch (err) {
          console.error(err);
          toast.error("Failed to remove address");
        }
      };

      const handleSetDefault = async (id) => {
        try {
          // Remove default from others
          const currentDefault = savedAddresses.find(a => a.isDefault);
          if (currentDefault) {
            await UserAddress.update(currentDefault.id, { isDefault: false });
          }
          await UserAddress.update(id, { isDefault: true });
          setSavedAddresses(prev => prev.map(addr => ({
            ...addr,
            isDefault: addr.id === id
          })));
          toast.success("Default address updated");
        } catch (err) {
          console.error(err);
          toast.error("Failed to update default address");
        }
      };

      return (
        <div className="flex flex-col h-full bg-[#0a0a0c]">
          <div className="p-4 border-b border-gray-800 flex items-center gap-3 sticky top-0 bg-[#0a0a0c] z-10 shadow-sm">
            <button 
              onClick={() => {
                if (isAddingAddress) setIsAddingAddress(false);
                else setAccountView('main');
              }} 
              className="p-1 hover:bg-slate-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-300" />
            </button>
            <h2 className="text-lg font-bold text-white tracking-wide">{isAddingAddress ? "Add New Address" : "Saved Addresses"}</h2>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 pb-24">
              {isAddingAddress ? (
                <form onSubmit={handleSaveAddress} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400">Full Name</label>
                    <Input value={newAddress.name} onChange={e => setNewAddress({...newAddress, name: e.target.value})} placeholder="John Doe" className="bg-slate-900 border-gray-800 text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400">Phone Number</label>
                    <Input value={newAddress.phone} onChange={e => setNewAddress({...newAddress, phone: e.target.value})} placeholder="+91 9876543210" className="bg-slate-900 border-gray-800 text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400">Street Address / House No.</label>
                    <Input value={newAddress.street} onChange={e => setNewAddress({...newAddress, street: e.target.value})} placeholder="123 Main St, Apartment 4B" className="bg-slate-900 border-gray-800 text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400">City</label>
                      <Input value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} placeholder="Mumbai" className="bg-slate-900 border-gray-800 text-white" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400">State</label>
                      <Input value={newAddress.state} onChange={e => setNewAddress({...newAddress, state: e.target.value})} placeholder="Maharashtra" className="bg-slate-900 border-gray-800 text-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400">Pincode</label>
                    <Input value={newAddress.pincode} onChange={e => setNewAddress({...newAddress, pincode: e.target.value})} placeholder="400001" className="bg-slate-900 border-gray-800 text-white" />
                  </div>
                  
                  <Button type="submit" className="w-full bg-[#00FFFF] hover:bg-[#00FFFF]/80 text-black font-bold mt-6 h-12">
                    Save Address
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  {savedAddresses.length === 0 ? (
                    <div className="text-center py-10 bg-slate-900 rounded-xl border border-gray-800">
                      <Home className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 font-medium">No saved addresses</p>
                    </div>
                  ) : (
                    savedAddresses.map(addr => (
                      <div key={addr.id} className="bg-slate-900 border border-gray-800 p-4 rounded-xl relative group">
                        {addr.isDefault && (
                          <Badge className="absolute top-4 right-4 bg-[#00FFFF]/10 text-[#00FFFF] border border-[#00FFFF]/20">Default</Badge>
                        )}
                        <h3 className="font-bold text-white text-lg">{addr.name}</h3>
                        <p className="text-gray-400 text-sm mt-1">{addr.phone}</p>
                        <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                          {addr.street}<br/>
                          {addr.city}, {addr.state} - {addr.pincode}
                        </p>
                        
                        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-800">
                          {!addr.isDefault && (
                            <button onClick={() => handleSetDefault(addr.id)} className="text-xs font-bold text-[#00FFFF] hover:underline">Set as Default</button>
                          )}
                          <button onClick={() => handleRemoveAddress(addr.id)} className="text-xs font-bold text-red-500 hover:underline ml-auto flex items-center gap-1">
                            <Trash2 className="w-3 h-3" /> Remove
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                  
                  <Button 
                    onClick={() => setIsAddingAddress(true)}
                    variant="outline" 
                    className="w-full border-dashed border-2 border-gray-700 bg-transparent hover:bg-slate-800 text-[#00FFFF] hover:text-[#00FFFF] h-14 flex items-center justify-center gap-2 font-bold"
                  >
                    <Plus className="w-5 h-5" /> Add New Address
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      );
    }

    if (accountView === 'history') {
      return (
        <div className="flex flex-col h-full bg-[#0a0a0c]">
          <div className="p-4 border-b border-gray-800 flex items-center gap-3 sticky top-0 bg-[#0a0a0c] z-10 shadow-sm">
            <button onClick={() => setAccountView('main')} className="p-1 hover:bg-slate-800 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-gray-300" /></button>
            <h2 className="text-lg font-bold text-white tracking-wide">Purchase History</h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 pb-24">
              {purchaseHistory.length === 0 ? (
                <div className="text-center py-10 bg-slate-900 rounded-xl border border-gray-800">
                  <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 font-medium">No purchase history found</p>
                  <Button onClick={() => { setAccountView('main'); setActiveTab('home'); }} className="mt-4 bg-transparent border border-gray-700 hover:bg-slate-800 text-white">Start Shopping</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {purchaseHistory.map(order => (
                    <div key={order.id} className="bg-slate-900 border border-gray-800 rounded-xl overflow-hidden shadow-sm">
                      <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-slate-800/30">
                        <div>
                          <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-bold mb-0.5">Order ID</p>
                          <p className="text-xs sm:text-sm font-bold text-white font-mono">{order.id}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-bold mb-0.5">Date</p>
                          <p className="text-xs sm:text-sm font-medium text-white">{order.date}</p>
                        </div>
                      </div>
                      <div className="p-4 space-y-4">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex gap-3 sm:gap-4 items-center">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-slate-900 p-1 overflow-hidden shrink-0 border border-gray-800 flex items-center justify-center">
                              <img src={item.image} alt={item.name} className="max-w-full max-h-full object-contain" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm sm:text-base font-bold text-white line-clamp-1">{item.name}</h4>
                              <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm sm:text-base font-bold text-white">₹{item.price}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 border-t border-gray-800 flex items-center justify-between bg-slate-900">
                        <div>
                          <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider font-bold mb-0.5">Total Amount</p>
                          <p className="text-base sm:text-lg font-black text-[#00FFFF]">₹{order.total}</p>
                        </div>
                        <div className="text-right">
                          <Badge className={`${order.status === 'Delivered' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-orange-500/10 text-blue-400 border-orange-500/20'}`}>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      );
    }

    if (['privacy', 'terms', 'refund', 'shipping', 'support'].includes(accountView)) {
      const policyContent = {
        privacy: {
          title: dynamicPolicies['privacy_policy']?.title || "Privacy Policy",
          icon: Shield,
          color: "text-green-400",
          content: dynamicPolicies['privacy_policy']?.content ? (
            <div className="space-y-4 text-gray-300 text-sm leading-relaxed text-left whitespace-pre-wrap">
              {dynamicPolicies['privacy_policy'].content}
            </div>
          ) : (
            <div className="space-y-4 text-gray-300 text-sm leading-relaxed text-left">
              <p>At BATTLEHUB STORE, your privacy is our top priority. This Privacy Policy outlines how we collect, use, and protect your personal information.</p>
              <h3 className="text-white font-bold text-base mt-4">1. Information We Collect</h3>
              <p>We may collect personal details such as your name, email address, shipping address, and payment information when you make a purchase or create an account.</p>
            </div>
          )
        },
        terms: {
          title: dynamicPolicies['terms_conditions']?.title || "Terms of Service",
          icon: FileText,
          color: "text-blue-400",
          content: dynamicPolicies['terms_conditions']?.content ? (
            <div className="space-y-4 text-gray-300 text-sm leading-relaxed text-left whitespace-pre-wrap">
              {dynamicPolicies['terms_conditions'].content}
            </div>
          ) : (
            <div className="space-y-4 text-gray-300 text-sm leading-relaxed text-left">
              <p>Welcome to BATTLEHUB STORE. By accessing or using our services, you agree to be bound by these Terms of Service.</p>
            </div>
          )
        },
        refund: {
          title: dynamicPolicies['refund_policy']?.title || "Return & Refund Policy",
          icon: Package,
          color: "text-purple-400",
          content: dynamicPolicies['refund_policy']?.content ? (
            <div className="space-y-4 text-gray-300 text-sm leading-relaxed text-left whitespace-pre-wrap">
              {dynamicPolicies['refund_policy'].content}
            </div>
          ) : (
            <div className="space-y-4 text-gray-300 text-sm leading-relaxed text-left">
              <p>We want you to be completely satisfied with your purchase. If you are not happy, here is how we can help.</p>
            </div>
          )
        },
        shipping: {
          title: dynamicPolicies['shipping_policy']?.title || "Shipping Information",
          icon: Package,
          color: "text-orange-400",
          content: dynamicPolicies['shipping_policy']?.content ? (
            <div className="space-y-4 text-gray-300 text-sm leading-relaxed text-left whitespace-pre-wrap">
              {dynamicPolicies['shipping_policy'].content}
            </div>
          ) : (
            <div className="space-y-4 text-gray-300 text-sm leading-relaxed text-left">
              <p>Here is everything you need to know about how we deliver our products to you.</p>
            </div>
          )
        },
        support: {
          title: dynamicPolicies['support']?.title || "Help Center & Support",
          icon: HelpCircle,
          color: "text-rose-400",
          content: dynamicPolicies['support']?.content ? (
            <div className="space-y-4 text-gray-300 text-sm leading-relaxed text-left whitespace-pre-wrap">
              {dynamicPolicies['support'].content}
            </div>
          ) : (
            <div className="space-y-4 text-gray-300 text-sm leading-relaxed text-left">
              <p>Need help? We're here for you 24/7.</p>
            </div>
          )
        }
      };

      const policy = policyContent[accountView];
      const Icon = policy.icon;

      return (
        <div className="flex flex-col h-full bg-[#0a0a0c]">
          <div className="p-4 border-b border-gray-800 flex items-center gap-3 sticky top-0 bg-[#0a0a0c] z-10 shadow-sm">
            <button onClick={() => setAccountView('main')} className="p-1 hover:bg-slate-800 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-gray-300" /></button>
            <h2 className="text-lg font-bold text-white tracking-wide">{policy.title}</h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-5 pb-24 max-w-3xl mx-auto">
              {policy.content}
              <div className="mt-12 pt-6 border-t border-gray-800 text-left">
                <p className="text-xs text-gray-500 font-mono">Last updated: {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </ScrollArea>
        </div>
      );
    }

    if (accountView === 'wishlist') {
      return (
        <div className="flex flex-col h-full bg-[#0a0a0c]">
          <div className="p-4 border-b border-gray-800 flex items-center gap-3 sticky top-0 bg-[#0a0a0c] z-10 shadow-sm">
            <button onClick={() => setAccountView('main')} className="p-1 hover:bg-slate-800 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-gray-300" /></button>
            <h2 className="text-lg font-bold text-white tracking-wide">Wishlist</h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 pb-24 space-y-4">
              {wishlistItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-gray-800">
                    <Heart className="w-8 h-8 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Your wishlist is empty</h3>
                  <p className="text-sm text-gray-500 mt-1">Save items you like to buy later.</p>
                  <Button onClick={() => { setAccountView('main'); setActiveTab('home'); }} className="mt-6 bg-[#00FFFF] text-black hover:bg-[#00FFFF]/80 font-bold">Explore Products</Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {wishlistItems.map(item => (
                    <div key={item.id} className="bg-slate-900 border border-gray-800 rounded-xl p-3 flex gap-4 relative group">
                      <img src={item.image} alt={item.product_name} className="w-24 h-24 object-contain bg-slate-900 rounded-lg p-1" />
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-white line-clamp-2">{item.product_name}</h4>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-base font-bold text-[#00FFFF]">₹{item.price}</span>
                            <span className="text-xs text-gray-500 line-through">₹{item.originalPrice}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <Button onClick={() => addToCart({ id: item.product_id, name: item.product_name, price: item.price, originalPrice: item.originalPrice, image: item.image })} className="flex-1 h-8 text-xs bg-slate-800 hover:bg-slate-700 text-white border border-gray-700">Add to Cart</Button>
                          <Button variant="ghost" onClick={(e) => toggleWishlist(e, { id: item.product_id })} className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      );
    }

    if (accountView === 'sell') {
      const handleSellerRegister = (e) => {
        e.preventDefault();
        if (!sellerRegForm.shopName || !sellerRegForm.phone || !sellerRegForm.agreed) {
          toast.error("Please fill all details and agree to terms.");
          return;
        }
        setIsSeller(true);
        toast.success("Seller account created successfully! You can now list products.");
      };

      const handleImageUpload = (e) => {
        // Mock image upload
        if (sellForm.images.length >= 8) {
          toast.error("Maximum 8 images allowed");
          return;
        }
        const newImages = [...sellForm.images, 'mock_image_url_' + Date.now()];
        setSellForm({ ...sellForm, images: newImages });
        toast.success("Image added successfully");
      };

      const removeImage = (index) => {
        const newImages = sellForm.images.filter((_, i) => i !== index);
        setSellForm({ ...sellForm, images: newImages });
      };

      const handleSellSubmit = async (e) => {
        e.preventDefault();
        if (!sellForm.name || !sellForm.category || !sellForm.expectedPrice || !sellForm.description) {
          toast.error("Please fill in all mandatory fields.");
          return;
        }
        if (sellForm.images.length === 0) {
          toast.error("Please add at least 1 product image.");
          return;
        }

        try {
          await SellRequest.create({
            user_id: user?.id,
            ...sellForm,
            status: 'pending'
          });
          toast.success("Product listed for review successfully!");
          setSellForm({ name: '', category: '', expectedPrice: '', description: '', images: [] });
          setAccountView('main');
        } catch (err) {
          toast.error("Failed to list product");
        }
      };

      if (!isSeller && !user?.isSeller) {
        // Seller Onboarding View
        return (
          <div className="flex flex-col h-full bg-[#0a0a0c]">
            <div className="p-4 border-b border-gray-800 flex items-center gap-3 sticky top-0 bg-[#0a0a0c] z-10 shadow-sm">
              <button onClick={() => setAccountView('main')} className="p-1 hover:bg-slate-800 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-gray-300" /></button>
              <h2 className="text-lg font-bold text-white tracking-wide">Become a Seller</h2>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-5 pb-24 max-w-md mx-auto">
                <div className="bg-gradient-to-br from-red-950/50 to-slate-900 border border-red-500/30 rounded-xl p-6 mb-8 text-center shadow-lg shadow-red-950/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Store className="w-24 h-24" />
                  </div>
                  <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/50">
                    <Store className="w-8 h-8 text-[#00FFFF]" />
                  </div>
                  <h3 className="text-white font-black text-xl mb-2">Sell on BATTLEHUB</h3>
                  <p className="text-gray-400 text-sm">Create your seller account to list gaming gear, merchandise, and digital items to thousands of gamers.</p>
                </div>

                {enableSellerOnboarding ? (
                  <form onSubmit={handleSellerRegister} className="space-y-5 bg-slate-900/50 p-5 rounded-xl border border-gray-800">
                    <div className="space-y-1.5 text-left">
                      <label className="text-sm font-bold text-gray-300">Shop / Store Name <span className="text-red-500">*</span></label>
                      <Input value={sellerRegForm.shopName} onChange={e => setSellerRegForm({...sellerRegForm, shopName: e.target.value})} placeholder="e.g. ProGamer Gear" className="bg-slate-950 border-gray-700 text-white focus-visible:ring-[#00FFFF]" />
                    </div>
                    <div className="space-y-1.5 text-left">
                      <label className="text-sm font-bold text-gray-300">Phone Number <span className="text-red-500">*</span></label>
                      <Input type="tel" value={sellerRegForm.phone} onChange={e => setSellerRegForm({...sellerRegForm, phone: e.target.value})} placeholder="+91" className="bg-slate-950 border-gray-700 text-white focus-visible:ring-[#00FFFF]" />
                    </div>
                    <div className="flex items-start gap-3 pt-2">
                      <input 
                        type="checkbox" 
                        id="terms" 
                        checked={sellerRegForm.agreed} 
                        onChange={e => setSellerRegForm({...sellerRegForm, agreed: e.target.checked})} 
                        className="mt-1 w-4 h-4 rounded border-gray-700 text-[#00FFFF] focus:ring-[#00FFFF] bg-slate-950" 
                      />
                      <label htmlFor="terms" className="text-xs text-gray-400 leading-relaxed cursor-pointer">
                        I agree to the <span className="text-[#00FFFF] hover:underline" onClick={(e) => { e.preventDefault(); setShowSellerTerms(true); }}>Seller Terms & Conditions</span>. I understand that all listings will be reviewed by BattleHub before going live.
                      </label>
                    </div>
                    <Button type="submit" className="w-full h-12 bg-[#00FFFF] hover:bg-[#00FFFF]/80 text-black font-bold mt-4 text-base">
                      Create Seller Account
                    </Button>
                  </form>
                ) : (
                  <div className="bg-slate-900/50 p-6 rounded-xl border border-gray-800 text-center">
                    <Store className="w-12 h-12 text-gray-500 mx-auto mb-3 opacity-50" />
                    <h4 className="text-white font-bold mb-2">Seller Registrations Paused</h4>
                    <p className="text-gray-400 text-sm">We are currently not accepting new seller applications. Please check back later or contact support for more information.</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Seller Terms Modal */}
            {showSellerTerms && (
              <div className="absolute inset-0 z-[600] bg-black/80 flex items-center justify-center p-4">
                <div className="bg-slate-950 border border-gray-800 rounded-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
                  <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <h3 className="font-bold text-white text-lg">Seller Terms & Conditions</h3>
                    <button onClick={() => setShowSellerTerms(false)} className="p-1 hover:bg-slate-800 rounded-full transition-colors text-gray-400 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-4 overflow-y-auto flex-1">
                    {dynamicPolicies.seller_terms ? (
                      <div className="prose prose-invert prose-sm max-w-none text-gray-300" dangerouslySetInnerHTML={{ __html: dynamicPolicies.seller_terms.content }} />
                    ) : (
                      <p className="text-gray-400 text-sm">Terms and Conditions will be updated soon by the admin.</p>
                    )}
                  </div>
                  <div className="p-4 border-t border-gray-800">
                    <Button onClick={() => setShowSellerTerms(false)} className="w-full bg-[#00FFFF] hover:bg-[#00FFFF]/80 text-black font-bold">
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }

      // Professional Sell Product View
      return (
        <div className="flex flex-col h-full bg-[#0a0a0c]">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-[#0a0a0c] z-10 shadow-sm">
            <div className="flex items-center gap-3">
              <button onClick={() => setAccountView('main')} className="p-1 hover:bg-slate-800 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-gray-300" /></button>
              <h2 className="text-lg font-bold text-white tracking-wide">List New Product</h2>
            </div>
            <Badge className="bg-red-500/20 text-indigo-400 border border-red-500/50">Seller Mode</Badge>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-24">
              
              <form onSubmit={handleSellSubmit} className="space-y-6">
                {/* Basic Details */}
                <div className="bg-slate-900 border border-gray-800 rounded-xl p-5 space-y-5">
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-800 pb-2">Basic Details</h3>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-300 flex justify-between">
                      <span>Product Name <span className="text-red-500">*</span></span>
                      <span className="text-xs text-gray-500 font-normal">{sellForm.name.length}/100</span>
                    </label>
                    <Input 
                      value={sellForm.name} 
                      onChange={e => setSellForm({...sellForm, name: e.target.value})} 
                      placeholder="e.g. Logitech G Pro X Superlight Wireless" 
                      maxLength={100}
                      className="bg-slate-950 border-gray-700 text-white focus-visible:ring-[#00FFFF] h-11" 
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-300">Category <span className="text-red-500">*</span></label>
                      <select 
                        value={sellForm.category} 
                        onChange={e => setSellForm({...sellForm, category: e.target.value})} 
                        className="w-full h-11 px-3 py-2 rounded-md bg-slate-950 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFFF]"
                      >
                        <option value="">Select Category</option>
                        <option value="gear">Gaming Gear</option>
                        <option value="merch">Merchandise</option>
                        <option value="components">PC Components</option>
                        <option value="accessories">Accessories</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-300">Selling Price (₹) <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                        <Input 
                          type="number" 
                          value={sellForm.expectedPrice} 
                          onChange={e => setSellForm({...sellForm, expectedPrice: e.target.value})} 
                          placeholder="0.00" 
                          className="bg-slate-950 border-gray-700 text-white focus-visible:ring-[#00FFFF] h-11 pl-8 font-mono" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Media */}
                <div className="bg-slate-900 border border-gray-800 rounded-xl p-5">
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-800 pb-2 flex justify-between items-center">
                    <span>Product Images <span className="text-red-500">*</span></span>
                    <span className="text-xs font-normal text-gray-500">{sellForm.images.length}/8 Added</span>
                  </h3>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
                    {sellForm.images.map((img, idx) => (
                      <div key={idx} className="aspect-square bg-slate-800 rounded-lg border border-gray-700 relative group overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                          <button type="button" onClick={() => removeImage(idx)} className="p-2 bg-red-500 rounded-full text-white hover:scale-110 transition-transform">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {/* Mock image preview */}
                        <Monitor className="w-8 h-8 text-gray-600" />
                        <span className="absolute bottom-1 right-2 text-[10px] text-gray-500 font-bold">Img {idx+1}</span>
                      </div>
                    ))}
                    
                    {sellForm.images.length < 8 && (
                      <button 
                        type="button"
                        onClick={handleImageUpload}
                        className="aspect-square bg-slate-950 border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-[#00FFFF] hover:bg-[#00FFFF]/5 transition-colors text-gray-500 hover:text-[#00FFFF]"
                      >
                        <Plus className="w-6 h-6" />
                        <span className="text-[10px] font-bold uppercase">Add Photo</span>
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">First image will be the cover. Add clear, well-lit photos (Max 8).</p>
                </div>

                {/* Description */}
                <div className="bg-slate-900 border border-gray-800 rounded-xl p-5">
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-800 pb-2">Description & Condition</h3>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-300 flex justify-between">
                      <span>Product Description <span className="text-red-500">*</span></span>
                    </label>
                    <textarea 
                      value={sellForm.description} 
                      onChange={e => setSellForm({...sellForm, description: e.target.value})} 
                      placeholder="Detail the product condition, age, warranty status, accessories included, and any defects. The more details, the faster it sells!" 
                      className="w-full h-32 px-4 py-3 rounded-md bg-slate-950 border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00FFFF] resize-none leading-relaxed" 
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 flex gap-3">
                  <Button type="button" onClick={() => setAccountView('main')} className="flex-1 h-12 bg-slate-800 hover:bg-slate-700 text-white font-bold border border-gray-700">Cancel</Button>
                  <Button type="submit" className="flex-[2] h-12 bg-[#00FFFF] hover:bg-[#00FFFF]/80 text-black font-black text-base shadow-lg shadow-[#00FFFF]/20">Submit Listing for Review</Button>
                </div>

              </form>
            </div>
          </ScrollArea>
        </div>
      );
    }

    if (accountView === 'payment') {
      const titles = { payment: "Payment Methods" };
      return (
        <div className="flex flex-col h-full bg-[#0a0a0c]">
          <div className="p-4 border-b border-gray-800 flex items-center gap-3 sticky top-0 bg-[#0a0a0c] z-10 shadow-sm">
            <button onClick={() => setAccountView('main')} className="p-1 hover:bg-slate-800 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-gray-300" /></button>
            <h2 className="text-lg font-bold text-white tracking-wide">{titles[accountView]}</h2>
          </div>
          <div className="flex-1 p-4 pb-24 flex flex-col items-center justify-center text-center mt-16">
             <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-gray-800 shadow-inner">
               <CreditCard className="w-10 h-10 text-gray-600" />
             </div>
             <h3 className="text-xl font-bold text-white mb-2">Coming Soon</h3>
             <p className="text-gray-500 text-sm max-w-[250px] mx-auto leading-relaxed">We're still polishing the {titles[accountView].toLowerCase()} feature. Check back later!</p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 pb-24 space-y-6">
        <div className="bg-slate-900 rounded-xl p-4 flex items-center gap-4 shadow-sm border border-gray-800">
          <Avatar className="w-16 h-16 border-2 border-[#00FFFF] shadow-lg shrink-0">
            <AvatarImage src={user?.avatar_url || user?.avatar || user?.dp || user?.photoURL} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-tr from-[#00FFFF] to-orange-600 text-black font-bold text-2xl uppercase">
              {(user?.name || user?.username || 'U').charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="overflow-hidden">
            <h3 className="text-lg font-bold text-white truncate">{user?.name || user?.username || 'User'}</h3>
            <p className="text-xs text-[#00FFFF] font-medium mt-0.5 font-mono">UID: {user?.unique_id || user?.uid || user?.id || 'N/A'}</p>
          </div>
        </div>
        
        {/* Account Options */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-2">Account Options</h3>
          <div className="bg-slate-900 rounded-xl overflow-hidden border border-gray-800 shadow-sm">
            <button onClick={() => setAccountView('addresses')} className="w-full flex items-center justify-between p-4 hover:bg-slate-800 transition-colors border-b border-gray-800 text-left group">
              <div className="flex items-center gap-3"><Home className="w-5 h-5 text-gray-400 group-hover:text-[#00FFFF] transition-colors" /><span className="text-white font-medium text-sm">Addresses</span></div>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
            </button>
            <button onClick={() => setAccountView('history')} className="w-full flex items-center justify-between p-4 hover:bg-slate-800 transition-colors border-b border-gray-800 text-left group">
              <div className="flex items-center gap-3"><Package className="w-5 h-5 text-gray-400 group-hover:text-[#00FFFF] transition-colors" /><span className="text-white font-medium text-sm">Purchase History</span></div>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
            </button>
            <button onClick={() => setAccountView('wishlist')} className="w-full flex items-center justify-between p-4 hover:bg-slate-800 transition-colors border-b border-gray-800 text-left group">
              <div className="flex items-center gap-3"><Heart className="w-5 h-5 text-gray-400 group-hover:text-[#00FFFF] transition-colors" /><span className="text-white font-medium text-sm">Wishlist</span></div>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
            </button>
            {isSeller ? (
              <button onClick={() => navigate('/seller')} className="w-full flex items-center justify-between p-4 hover:bg-slate-800 transition-colors text-left group">
                <div className="flex items-center gap-3"><Store className="w-5 h-5 text-gray-400 group-hover:text-[#00FFFF] transition-colors" /><span className="text-[#00FFFF] font-bold text-sm">Seller Dashboard</span></div>
                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
              </button>
            ) : (
              <button onClick={() => setAccountView('sell')} className="w-full flex items-center justify-between p-4 hover:bg-slate-800 transition-colors text-left group">
                <div className="flex items-center gap-3"><ShoppingCart className="w-5 h-5 text-gray-400 group-hover:text-[#00FFFF] transition-colors" /><span className="text-white font-medium text-sm">Sell on BattleHub</span></div>
                <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
              </button>
            )}
          </div>
        </div>

        {/* Legal & Policies */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-2">Legal & Policies</h3>
          <div className="bg-slate-900 rounded-xl overflow-hidden border border-gray-800 shadow-sm">
            <button onClick={() => setAccountView('privacy')} className="w-full flex items-center justify-between p-4 hover:bg-slate-800 transition-colors border-b border-gray-800 text-left group">
              <div className="flex items-center gap-3"><Shield className="w-5 h-5 text-gray-400 group-hover:text-green-400 transition-colors" /><span className="text-white font-medium text-sm">Privacy Policy</span></div>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
            </button>
            <button onClick={() => setAccountView('terms')} className="w-full flex items-center justify-between p-4 hover:bg-slate-800 transition-colors border-b border-gray-800 text-left group">
              <div className="flex items-center gap-3"><FileText className="w-5 h-5 text-gray-400 group-hover:text-green-400 transition-colors" /><span className="text-white font-medium text-sm">Terms of Service</span></div>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
            </button>
            <button onClick={() => setAccountView('refund')} className="w-full flex items-center justify-between p-4 hover:bg-slate-800 transition-colors border-b border-gray-800 text-left group">
              <div className="flex items-center gap-3"><Package className="w-5 h-5 text-gray-400 group-hover:text-green-400 transition-colors" /><span className="text-white font-medium text-sm">Return & Refund Policy</span></div>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
            </button>
            <button onClick={() => setAccountView('shipping')} className="w-full flex items-center justify-between p-4 hover:bg-slate-800 transition-colors text-left group">
              <div className="flex items-center gap-3"><Package className="w-5 h-5 text-gray-400 group-hover:text-green-400 transition-colors" /><span className="text-white font-medium text-sm">Shipping Information</span></div>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

        {/* Support & About */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-2">About & Support</h3>
          <div className="bg-slate-900 rounded-xl overflow-hidden border border-gray-800 shadow-sm">
            <button onClick={() => setAccountView('support')} className="w-full flex items-center justify-between p-4 hover:bg-slate-800 transition-colors text-left group">
              <div className="flex items-center gap-3"><HelpCircle className="w-5 h-5 text-gray-400 group-hover:text-[#00FFFF] transition-colors" /><span className="text-white font-medium text-sm">Help Center & Support</span></div>
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

      </div>
    );
  };

  const renderProductDetail = () => {
    if (!selectedProduct) return null;
    const discountPercent = Math.round(((selectedProduct.originalPrice - selectedProduct.price) / selectedProduct.originalPrice) * 100);
    const hasPurchased = purchaseHistory.some(order => order.items?.some(item => item.id === selectedProduct.id || item.name === selectedProduct.name));

    const userReview = productReviews.find(r => r.user_id === user?.id);

    return (
      <div key={selectedProduct.id} className="flex flex-col h-full bg-slate-950 pb-24 animate-in slide-in-from-right-8 duration-300">
        <div className="flex items-center gap-3 p-4 border-b border-slate-800 bg-slate-900 sticky top-0 z-20">
          <Button variant="ghost" size="icon" onClick={() => setSelectedProduct(null)} className="rounded-full hover:bg-slate-800 text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-lg font-bold text-white flex-1 truncate">{selectedProduct.name}</h2>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={(e) => toggleWishlist(e, selectedProduct)}
            className="rounded-full"
          >
            <Heart className={`w-5 h-5 ${wishlistItems.some(i => i.product_id === selectedProduct.id) ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-500'}`} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Images Gallery */}
          <div className="w-full bg-slate-950 relative border-b border-slate-800">
            {selectedProduct.images && selectedProduct.images.length > 0 ? (
              <div className="flex overflow-x-auto snap-x snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {selectedProduct.images.map((img, i) => (
                  <div key={i} className="w-full flex-none snap-center flex items-center justify-center p-6 aspect-square sm:aspect-[4/3]">
                    <img src={img} alt={`${selectedProduct.name} ${i+1}`} className="max-w-full max-h-full object-contain" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full flex items-center justify-center p-6 aspect-square sm:aspect-[4/3]">
                <img src={selectedProduct.image} alt={selectedProduct.name} className="max-w-full max-h-full object-contain" />
              </div>
            )}
            
            {/* Simple indicator dot hint */}
            {selectedProduct.images && selectedProduct.images.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
                {selectedProduct.images.map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="p-5 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-[#00FFFF]/10 text-[#00FFFF] border-[#00FFFF]/20 uppercase tracking-wider text-[10px]">{selectedProduct.category}</Badge>
                <div className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  {selectedProduct.rating} <Star className="w-3 h-3 fill-current" />
                </div>
                <span className="text-xs text-gray-500 font-medium">({selectedProduct.reviews} reviews)</span>
              </div>
              <h1 className="text-2xl font-bold text-white leading-snug">{selectedProduct.name}</h1>
              {selectedProduct.creator && (
                <p className="text-sm text-[#00FFFF] font-semibold mt-1">
                  By {selectedProduct.creator}
                </p>
              )}
            </div>

            <div className="flex items-end gap-3 pb-4 border-b border-slate-800">
              <span className="text-4xl font-black text-white">₹{selectedProduct.price}</span>
              <span className="text-lg text-gray-500 line-through mb-1">₹{selectedProduct.originalPrice}</span>
              <span className="text-sm font-bold text-green-500 mb-1.5">{discountPercent}% off</span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Description</h3>
              <div className="relative">
                <p className={`text-gray-400 text-sm leading-relaxed whitespace-pre-wrap ${!isDescriptionExpanded ? 'line-clamp-4' : ''}`}>
                  {selectedProduct.description || "No description available for this product."}
                </p>
                {selectedProduct.description && selectedProduct.description.length > 200 && (
                  <button 
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    className="text-[#00FFFF] text-sm font-medium mt-1 hover:underline focus:outline-none"
                  >
                    {isDescriptionExpanded ? "Read Less" : "Read More"}
                  </button>
                )}
              </div>
            </div>
            {/* Product Video */}
            {selectedProduct.video_url && (
              <div className="pt-4 border-t border-slate-800">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Product Video</h3>
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video flex items-center justify-center shadow-md">
                  {selectedProduct.video_url.includes('youtube.com') || selectedProduct.video_url.includes('youtu.be') ? (
                    <iframe 
                      className="w-full h-full"
                      src={selectedProduct.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} 
                      title="Product Video"
                      frameBorder="0" 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <BHTVPlayer 
                      src={selectedProduct.video_url}
                      poster={selectedProduct.image}
                      className="w-full h-full"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Ratings & Reviews</h3>
                {hasPurchased && !showReviewForm && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      if (userReview) {
                        setReviewForm({ id: userReview.id, rating: userReview.rating, text: userReview.text, images: userReview.images || [] });
                      } else {
                        setReviewForm({ id: null, rating: 5, text: '', images: [] });
                      }
                      setShowReviewForm(true);
                    }} 
                    className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700 text-xs h-8"
                  >
                    {userReview ? "Edit Review" : "Write Review"}
                  </Button>
                )}
              </div>

              {showReviewForm && (
                <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 mb-6">
                  <h4 className="text-white font-medium text-sm mb-3">Rate this product</h4>
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={star} 
                        onClick={() => setReviewForm({...reviewForm, rating: star})}
                        className="focus:outline-none"
                      >
                        <Star className={`w-6 h-6 ${star <= reviewForm.rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-600'}`} />
                      </button>
                    ))}
                  </div>
                  <textarea 
                    value={reviewForm.text}
                    onChange={(e) => setReviewForm({...reviewForm, text: e.target.value})}
                    placeholder="What did you like or dislike? How was the quality?"
                    className="w-full bg-slate-800 border border-slate-700 rounded p-3 text-sm text-white mb-3 focus:outline-none focus:border-[#00FFFF]"
                    rows={3}
                  />
                  {reviewForm.images.length > 0 && (
                    <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                      {reviewForm.images.map((img, idx) => (
                        <div key={idx} className="relative shrink-0 group">
                          <img src={img} alt="Review attachment" className="w-16 h-16 object-cover rounded-md border border-slate-700" />
                          <label className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center rounded-md cursor-pointer text-white transition-all">
                            <Upload className="w-5 h-5 opacity-70" />
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={async (e) => {
                                if (e.target.files && e.target.files[0]) {
                                  try {
                              const response = await UploadFile({ file: e.target.files[0] });
                                    const uploadedUrl = response.file_url || response;
                                    const newImages = [...reviewForm.images];
                                    newImages[idx] = uploadedUrl;
                                    setReviewForm({ ...reviewForm, images: newImages });
                                  } catch (err) {
                                    toast.error("Image replacement failed");
                                  }
                                }
                              }}
                            />
                          </label>
                          <button onClick={() => setReviewForm({ ...reviewForm, images: reviewForm.images.filter((_, i) => i !== idx) })} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {isUploadingImages && (
                    <div className="flex items-center gap-2 mb-3 text-sm text-[#00FFFF] animate-pulse">
                      <RefreshCcw className="w-4 h-4 animate-spin" /> Uploading image(s)...
                    </div>
                  )}

                  <div className="flex justify-between items-center mb-2">
                    <label className={`cursor-pointer ${isUploadingImages ? 'opacity-50 pointer-events-none' : ''}`}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple
                        className="hidden" 
                        onChange={async (e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            const files = Array.from(e.target.files);
                            if (reviewForm.images.length + files.length > 5) {
                              toast.error("Maximum 5 images allowed in total");
                              return;
                            }
                            setIsUploadingImages(true);
                            try {
                              const uploadPromises = files.map(f => UploadFile({ file: f }));
                              const responses = await Promise.all(uploadPromises);
                              const newUrls = responses.map(res => res.file_url || res);
                              setReviewForm(prev => ({ ...prev, images: [...prev.images, ...newUrls] }));
                              toast.success(`${files.length} image(s) uploaded successfully!`);
                            } catch (err) {
                              toast.error("Some images failed to upload");
                            }
                            setIsUploadingImages(false);
                          }
                        }}
                      />
                      <div className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#00FFFF] transition-colors">
                        <Upload className="w-4 h-4" /> Add Photo (Max 5)
                      </div>
                    </label>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setShowReviewForm(false)} className="text-gray-400 hover:text-white">Cancel</Button>
                    <Button size="sm" onClick={submitReview} disabled={isSubmittingReview} className="bg-[#00FFFF] text-black font-bold hover:bg-[#00FFFF]/80">
                      {isSubmittingReview ? "Submitting..." : "Submit"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {productReviews.length > 0 ? (
                  productReviews.map(review => (
                    <div key={review.id} className="border-b border-slate-800 pb-4 last:border-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="w-8 h-8 border border-slate-700">
                          <AvatarImage src={review.user_avatar} />
                          <AvatarFallback className="bg-slate-800 text-xs">{review.user_name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-white leading-none">{review.user_name}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <div className="flex">
                              {[1,2,3,4,5].map(star => (
                                <Star key={star} className={`w-3 h-3 ${star <= review.rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-600'}`} />
                              ))}
                            </div>
                            {review.created_date && <span className="text-[10px] text-gray-500 ml-1">{new Date(review.created_date).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 mb-2 leading-relaxed">{review.text}</p>
                      
                      {review.images && review.images.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 mt-2">
                          {review.images.map((img, idx) => (
                            <img key={idx} src={img} alt="Review" className="w-16 h-16 object-cover rounded-md border border-slate-700 cursor-pointer hover:border-[#00FFFF]" onClick={(e) => { e.stopPropagation(); setFullScreenImage({ images: review.images, index: idx }); }} />
                          ))}
                        </div>
                      )}
                      
                      <div className="flex gap-4 mt-2"></div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm italic">No reviews yet. {hasPurchased ? "Be the first to review!" : "Buy this product to leave a review."}</p>
                )}
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">Secure Checkout</h4>
                <p className="text-xs text-gray-400">100% protected payments & easy returns</p>
              </div>
            </div>

            {/* Suggested Products */}
            <div className="pt-6 mt-6 border-t border-slate-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">You might also like</h3>
              <div className="grid grid-cols-3 gap-3 pb-4">
                {products
                  .filter(p => p.id !== selectedProduct.id && p.category === selectedProduct.category)
                  .concat(products.filter(p => p.id !== selectedProduct.id && p.category !== selectedProduct.category)) // fallback if same category has few
                  .slice(0, 6)
                  .map(suggested => {
                    const discount = Math.round(((suggested.originalPrice - suggested.price) / suggested.originalPrice) * 100);
                    return (
                    <div 
                      key={suggested.id} 
                      onClick={() => { setSelectedProduct(suggested); }}
                      className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden flex flex-col cursor-pointer hover:border-[#00FFFF]/50 transition-colors"
                    >
                      <div className="h-28 sm:h-32 w-full bg-slate-800 p-2 flex items-center justify-center relative">
                        <img src={suggested.image} alt={suggested.name} className="max-w-full max-h-full object-contain hover:scale-110 transition-transform duration-300" />
                        {discount > 0 && (
                          <div className="absolute top-1 left-1 bg-green-500/90 backdrop-blur text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            {discount}% OFF
                          </div>
                        )}
                        <div className="absolute top-1 right-1 bg-black/60 backdrop-blur text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          {suggested.rating || '5.0'} <Star className="w-2 h-2 fill-yellow-500 text-yellow-500" />
                        </div>
                      </div>
                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <h4 className="text-xs font-medium text-white line-clamp-2 leading-tight mb-2">{suggested.name}</h4>
                        <div className="flex items-center gap-1.5 mt-auto">
                          <p className="text-sm font-black text-white">₹{suggested.price}</p>
                          <p className="text-[10px] text-gray-500 line-through">₹{suggested.originalPrice}</p>
                        </div>
                      </div>
                    </div>
                  )})}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur-md border-t border-slate-800 flex gap-3 z-30">
          <Button 
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white h-12 font-bold"
            onClick={() => addToCart(selectedProduct)}
          >
            <ShoppingCart className="w-5 h-5 mr-2" /> Add to Cart
          </Button>
          <Button 
            className="flex-1 bg-[#00FFFF] hover:bg-[#00FFFF]/80 text-black h-12 font-bold"
            onClick={() => {
              addToCart(selectedProduct);
              setSelectedProduct(null);
              setCartOpen(true);
            }}
          >
            Buy Now
          </Button>
        </div>
      </div>
    );
  };


  const renderHome = () => (
    <div className="pb-24">            {/* Banners Carousel */}
            {storeBanners.length > 0 && activeCategory === 'all' && searchQuery === '' && (
              <div className="px-4 mb-8">
                <div 
                  className="relative h-48 md:h-56 rounded-2xl overflow-hidden touch-pan-y"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                  {storeBanners.map((banner, index) => (
                    <div
                      key={banner.id}
                      className={`absolute inset-0 transition-opacity duration-500 flex items-center bg-slate-900 ${
                        index === activeBannerIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                      }`}
                    >
                      <img src={banner.image_url} alt={banner.title} className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                      <div className="relative z-10 p-4 md:p-8 w-full h-full flex flex-col justify-end pb-8">
                        {banner.title && <h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-wide drop-shadow-lg leading-tight">{banner.title}</h2>}
                        {banner.subtitle && <p className="text-gray-200 mt-1 text-sm md:text-base font-medium drop-shadow-md line-clamp-1">{banner.subtitle}</p>}
                        {banner.link_url && (
                          <div className="mt-4 flex">
                            <Button 
                              className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/20 shadow-lg rounded-full px-6 py-2 h-auto text-sm font-semibold transition-all hover:scale-105"
                              onClick={() => {
                                // If it's a product link like /product/12345
                                if (banner.link_url.startsWith('/product/')) {
                                  const pId = banner.link_url.split('/product/')[1];
                                  const product = products.find(p => p.id === pId);
                                  if (product) {
                                    // Open product drawer/modal - since there isn't a dedicated product modal right now, we can add it to cart or search it
                                    setSearchQuery(product.name);
                                  }
                                } else if (banner.link_url.startsWith('http')) {
                                  window.open(banner.link_url, '_blank');
                                }
                              }}
                            >
                              Explore Now <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Indicators */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
                    {storeBanners.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveBannerIndex(index)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          index === activeBannerIndex ? 'w-6 bg-[#00FFFF]' : 'w-2 bg-white/30'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

                {/* Products Grid */}
                <div className="p-2 sm:p-4">
                  {filteredProducts.length === 0 ? (
                    <div className="bg-slate-900 rounded-xl p-10 text-center flex flex-col items-center justify-center min-h-[300px] shadow-sm">
                      <Package className="w-16 h-16 text-gray-700 mb-4" />
                      <h3 className="text-lg font-bold text-white">No products found</h3>
                      <p className="text-gray-400 mt-2 text-sm">Try adjusting your search or category filter.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4">
                      {filteredProducts.map(product => {
                        const discountPercent = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
                        
                        return (
                          <div 
                            key={product.id} 
                            onClick={() => setSelectedProduct(product)}
                            className="bg-slate-900 border border-gray-800 rounded-lg sm:rounded-xl overflow-hidden hover:shadow-lg hover:border-[#00FFFF]/50 transition-all group flex flex-col cursor-pointer"
                          >
                            {/* Image Section */}
                            <div className="relative h-40 sm:h-48 bg-slate-900 p-4 flex items-center justify-center overflow-hidden">
                              <img 
                                src={product.image} 
                                alt={product.name} 
                                className="max-h-full object-contain group-hover:scale-110 transition-transform duration-300" 
                              />
                              <button 
                                onClick={(e) => toggleWishlist(e, product)}
                                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/10 backdrop-blur-md flex items-center justify-center hover:bg-black/30 transition-colors z-10"
                              >
                                <Heart className={`w-4 h-4 ${wishlistItems.some(i => i.product_id === product.id) ? 'fill-red-500 text-red-500' : 'text-gray-600 hover:text-red-500'}`} />
                              </button>
                            </div>
                            
                            {/* Details Section */}
                            <div className="p-3 sm:p-4 flex flex-col flex-1 border-t border-gray-800">
                              <div className="flex-1">
                                <h3 className="font-medium text-white text-sm sm:text-base line-clamp-2 leading-snug group-hover:text-[#00FFFF] transition-colors">{product.name}</h3>
                                {product.creator && (
                                  <p className="text-[10px] sm:text-xs text-[#00FFFF] font-semibold mt-1">
                                    By {product.creator}
                                  </p>
                                )}
                                
                                <div className="flex items-center gap-1.5 mt-2">
                                  <div className="bg-green-600 text-white text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                    {product.rating} <Star className="w-2.5 h-2.5 fill-current" />
                                  </div>
                                  <span className="text-[10px] sm:text-xs text-gray-500 font-medium">({product.reviews})</span>
                                </div>
                              </div>
                              
                              <div className="mt-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg sm:text-xl font-bold text-white">₹{product.price}</span>
                                  <span className="text-xs sm:text-sm text-gray-500 line-through">₹{product.originalPrice}</span>
                                  <span className="text-xs sm:text-sm font-bold text-green-600">{discountPercent}% off</span>
                                </div>
                                <Button 
                                  className="w-full mt-3 bg-[#00FFFF] text-black hover:bg-[#00FFFF]/80 font-bold"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToCart(product);
                                  }}
                                >
                                  Add to Cart
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
      </div>
  );

  const renderInvoice = () => {
    if (!selectedOrderDetails) return null;
    const order = selectedOrderDetails;
    const invoiceNo = `BHFF-INV-${(order.id || 'ORDER').substring(0,8).toUpperCase()}`;
    // Format date in a clean way without weird wrapping
    const rawDate = order.created_date ? new Date(order.created_date) : (order.date ? new Date(order.date) : new Date());
    const invoiceDate = rawDate.toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'});
    const invoiceTime = rawDate.toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit', hour12:true}).toUpperCase();
    
    // Calculate totals
    const subtotal = order.total || 0;
    const shipping = 0;
    const total = subtotal + shipping;

    // Helper to convert number to words (simple version)
    const numberToWords = (num) => {
      return `Rupees ${num} Only`; // Placeholder for simplicity, standard on small invoices
    };

    const handlePrint = () => {
      const originalTitle = document.title;
      const customerName = order.shipping_address?.name || user?.displayName || user?.name || 'Customer';
      const safeName = customerName.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').toUpperCase();
      document.title = `BATTLEHUB_FF_INVOICE_${safeName}_${invoiceNo}`;
      
      window.print();
      
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    };

    return (
      <div className="fixed inset-0 z-[600] bg-slate-900/95 flex flex-col items-center sm:p-6 overflow-hidden print:p-0 print:bg-white print:overflow-visible">
        {/* Top Controls (Hidden on Print) */}
        <div className="flex justify-end gap-3 p-4 sm:p-0 sm:mb-4 w-full max-w-[800px] mx-auto print:hidden">
          <Button onClick={handlePrint} className="bg-slate-800 hover:bg-slate-700 text-white font-bold h-10 px-6 shadow-lg border border-slate-700 rounded-lg transition-all">
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </Button>
          <button onClick={() => setShowInvoice(false)} className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg w-10 h-10 flex items-center justify-center transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Paper */}
        <div className="bg-white flex-1 sm:flex-none shadow-2xl flex flex-col w-full max-w-[800px] mx-auto relative overflow-hidden sm:rounded-xl print:shadow-none print:rounded-none text-slate-900">
          <ScrollArea className="flex-1 w-full h-full print:overflow-visible print:h-auto print:block">
            <div className="p-4 sm:p-12 w-full min-h-auto sm:min-h-[1123px] print:min-h-0 print:h-fit font-sans box-border flex flex-col relative print:p-0 bg-white">
              
              {/* Header section */}
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-6 sm:mb-8 border-b-2 border-slate-800 pb-4 sm:pb-8 gap-4 sm:gap-0">
                {/* Left side: Company Info */}
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1 sm:mb-2 uppercase">BATTLEHUB <span className="text-slate-900">FF</span></h1>
                  <div className="text-[10px] sm:text-xs leading-relaxed text-slate-600 font-medium">
                    <p className="font-bold text-slate-800">Greater Noida, Gautam Buddha Nagar</p>
                    <p>Uttar Pradesh, India - 201310</p>
                    <p>Email: helpbattlehub@gmail.com</p>
                    <p className="mt-1 font-bold">GSTIN: <span className="font-mono font-normal">09AABCU9603R1ZX</span></p>
                  </div>
                </div>

                {/* Right side: Invoice Details */}
                <div className="sm:text-right w-full sm:w-auto">
                  <h2 className="text-xl sm:text-3xl font-black text-slate-200 uppercase tracking-widest leading-none mb-3 sm:mb-4 print:text-slate-300">INVOICE</h2>
                  <div className="inline-block text-left bg-slate-50 p-2 sm:p-3 rounded-lg border border-slate-100 w-full sm:w-auto">
                    <div className="grid grid-cols-[auto_1fr] gap-x-3 sm:gap-x-4 gap-y-1 text-[10px] sm:text-xs">
                      <span className="font-bold text-slate-500 uppercase">Invoice No:</span>
                      <span className="font-mono font-bold text-slate-900">{invoiceNo}</span>
                      
                      <span className="font-bold text-slate-500 uppercase">Date:</span>
                      <span className="font-medium text-slate-900">{invoiceDate}</span>
                      
                      <span className="font-bold text-slate-500 uppercase">Time:</span>
                      <span className="font-medium text-slate-900">{invoiceTime}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bill To & Payment Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-12 mb-8 sm:mb-10">
                {/* Bill To */}
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-wider mb-2 sm:mb-3">Billed To</h3>
                  <div className="text-[11px] sm:text-sm text-slate-700 leading-relaxed">
                    <p className="font-bold text-slate-900 text-sm sm:text-base mb-1">{order.shipping_address?.name || user?.displayName || user?.name || 'Customer'}</p>
                    {user?.ign && <p className="font-medium">IGN: <span className="font-normal">{user.ign}</span></p>}
                    <p className="font-medium">Email: <span className="font-normal">{user?.email || 'N/A'}</span></p>
                    <p className="font-medium">Phone: <span className="font-normal">{order.shipping_address?.phone || user?.phone ? `+91 ${order.shipping_address?.phone || user?.phone}` : 'N/A'}</span></p>
                    {order.shipping_address?.street && (
                      <p className="mt-1 sm:mt-2 text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                        {order.shipping_address.street}, {order.shipping_address.city} <br/>
                        {order.shipping_address.state ? `${order.shipping_address.state} ` : ''} 
                        {order.shipping_address.pincode ? `- ${order.shipping_address.pincode}` : ''}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Payment Details */}
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-wider mb-2 sm:mb-3">Payment Info</h3>
                  <div className="bg-slate-50 rounded-lg p-3 sm:p-4 border border-slate-100">
                    <div className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] gap-y-2 text-[11px] sm:text-sm">
                      <span className="font-bold text-slate-600">Method:</span>
                      <span className="font-medium text-slate-900">{order.payment_method || 'UPI'}</span>
                      
                      <span className="font-bold text-slate-600">Txn ID:</span>
                      <span className="font-mono font-medium text-slate-900 break-all">{order.transaction_id || 'N/A'}</span>
                      
                      <span className="font-bold text-slate-600">Status:</span>
                      <span className={`font-bold ${order.status === 'Completed' || order.status === 'Delivered' ? 'text-emerald-600' : order.status === 'Processing' ? 'text-amber-600' : 'text-slate-900'}`}>
                        {order.status?.toUpperCase() || 'COMPLETED'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="mb-8 rounded-lg overflow-x-auto border border-slate-200">
                <table className="w-full border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="py-2 px-3 sm:py-3 sm:px-4 text-left text-[10px] sm:text-xs font-black text-slate-600 uppercase tracking-wider w-8 sm:w-12 border-b border-slate-200">#</th>
                      <th className="py-2 px-3 sm:py-3 sm:px-4 text-left text-[10px] sm:text-xs font-black text-slate-600 uppercase tracking-wider border-b border-slate-200">Item Description</th>
                      <th className="py-2 px-3 sm:py-3 sm:px-4 text-center text-[10px] sm:text-xs font-black text-slate-600 uppercase tracking-wider w-16 sm:w-24 border-b border-slate-200">Qty</th>
                      <th className="py-2 px-3 sm:py-3 sm:px-4 text-right text-[10px] sm:text-xs font-black text-slate-600 uppercase tracking-wider w-24 sm:w-32 border-b border-slate-200">Price</th>
                      <th className="py-2 px-3 sm:py-3 sm:px-4 text-right text-[10px] sm:text-xs font-black text-slate-600 uppercase tracking-wider w-24 sm:w-32 border-b border-slate-200">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(order.items || []).map((item, i) => (
                      <tr key={i} className="bg-white">
                        <td className="py-3 px-3 sm:py-4 sm:px-4 text-xs sm:text-sm text-slate-500 font-medium">{i + 1}</td>
                        <td className="py-3 px-3 sm:py-4 sm:px-4">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 m-0 leading-snug">{item.name}</p>
                          <p className="text-[10px] sm:text-xs text-slate-500 mt-1 m-0">{item.name?.toLowerCase().includes('coin') || item.name?.toLowerCase().includes('pass') ? 'Digital Goods' : 'Physical Goods'}</p>
                        </td>
                        <td className="py-3 px-3 sm:py-4 sm:px-4 text-xs sm:text-sm text-slate-700 text-center font-medium">{item.quantity}</td>
                        <td className="py-3 px-3 sm:py-4 sm:px-4 text-xs sm:text-sm text-slate-700 text-right font-medium">₹{item.price?.toFixed(2)}</td>
                        <td className="py-3 px-3 sm:py-4 sm:px-4 text-xs sm:text-sm font-bold text-slate-900 text-right">₹{(item.price * item.quantity)?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Section */}
              <div className="flex flex-col-reverse sm:flex-row justify-between items-start mb-10 sm:mb-12 gap-6 sm:gap-0">
                {/* Amount in words */}
                <div className="w-full sm:w-[50%] pt-2">
                  <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Amount in Words:</p>
                  <p className="text-xs sm:text-sm font-medium text-slate-700 italic">{numberToWords(total?.toFixed(2))}</p>
                </div>

                {/* Totals Box */}
                <div className="w-full sm:w-[40%] bg-slate-50 rounded-lg border border-slate-200 p-3 sm:p-4">
                  <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-slate-600">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Subtotal</span>
                      <span className="font-bold text-slate-900">₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Shipping</span>
                      <span className="font-bold text-slate-900">{shipping === 0 ? 'Free' : `₹${shipping.toFixed(2)}`}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2 sm:pb-3">
                      <span className="font-medium">Tax (GST)</span>
                      <span className="font-bold text-slate-900">Inclusive</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-sm sm:text-base font-black text-slate-900 uppercase">Grand Total</span>
                      <span className="text-base sm:text-xl font-black text-slate-900">₹{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer / T&C - Pushed to bottom */}
              <div className="mt-auto pt-6 sm:pt-8 border-t border-slate-200 flex justify-between items-end">
                <div className="w-full">
                  <h4 className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider mb-1 sm:mb-2">Terms & Conditions</h4>
                  <ul className="text-[8px] sm:text-[10px] text-slate-500 space-y-1 list-disc pl-3">
                    <li>Computer generated invoice, no physical signature required.</li>
                    <li>Digital goods (Coins/Passes) are non-refundable.</li>
                    <li>Physical merchandise returns accepted within 7 days.</li>
                    <li>Support: helpbattlehub@gmail.com</li>
                  </ul>
                </div>
              </div>

              <div className="text-center mt-8 sm:mt-12 mb-2 sm:mb-4">
                <p className="text-[8px] sm:text-xs font-bold text-slate-400 tracking-widest sm:tracking-[0.2em] uppercase m-0">Thank you for shopping</p>
              </div>

            </div>
          </ScrollArea>
        </div>
      </div>
    );
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(val) => !val && onClose()} modal={false}>
        <SheetContent 
          side="right" 
          hideClose
          className="w-full sm:max-w-2xl lg:max-w-4xl bg-slate-950 border-gray-800 p-0 text-white overflow-hidden flex flex-col z-[520]"
          onInteractOutside={(e) => e.preventDefault()}
        >
          {/* Header */}
          <div className="bg-slate-950 border-b border-gray-800 p-4 sticky top-0 z-20 flex items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white tracking-wider flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" /> BATTLEHUB <span className="text-[#00FFFF]">STORE</span>
              </h2>
            </div>
            
            {(!selectedProduct && !selectedOrderDetails && activeTab === 'home') && (
              <div className="flex-1 max-w-md hidden sm:block relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for products, merchandise and more..." 
                  className="w-full pl-9 bg-slate-900 text-white border-slate-700 focus-visible:ring-2 focus-visible:ring-[#00FFFF] h-10 placeholder:text-gray-500"
                />
              </div>
            )}

            <div className="flex items-center gap-4">

              <button onClick={() => setCartOpen(true)} className="text-white hover:text-[#00FFFF] relative p-1 transition-colors flex items-center gap-2">
                <ShoppingCart className="w-6 h-6" />
                <span className="hidden sm:inline font-bold">Cart</span>
                {cart.length > 0 && (
                  <span className="absolute -top-1 sm:top-0 right-0 sm:-right-2 bg-[#00FFFF] text-black text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </button>

              {(!selectedProduct && !selectedOrderDetails && activeTab === 'home') && (
                <button onClick={onClose} className="p-2 bg-slate-900 border border-gray-800 text-gray-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 rounded-full transition-all flex items-center justify-center">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          
          {/* Mobile Search */}
          {(!selectedProduct && !selectedOrderDetails && activeTab === 'home') && (
            <div className="sm:hidden bg-slate-950 px-4 pb-4 border-b border-gray-800">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..." 
                  className="w-full pl-9 bg-slate-900 text-white border-slate-700 focus-visible:ring-2 focus-visible:ring-[#00FFFF] placeholder:text-gray-500"
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto bg-[#0a0a0c] relative">
            {showInvoice && renderInvoice()}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-[#00FFFF] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {selectedProduct ? (
                  renderProductDetail()
                ) : (
                  <>
                    {activeTab === 'home' && renderHome()}
                    {activeTab === 'orders' && renderOrders()}
                    {activeTab === 'account' && renderAccount()}
                  </>
                )}
              </>
            )}
          </div>

          {/* Bottom Navigation */}
          {!selectedProduct && (
            <div className="bg-slate-950 border-t border-gray-800 pb-safe shrink-0 z-20">
            <div className="flex items-center justify-around p-1.5 sm:p-2">
              <button 
                onClick={() => { setActiveTab('home'); setSelectedOrderDetails(null); }}
                className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 ${activeTab === 'home' ? 'bg-[#00FFFF]/10 text-[#00FFFF]' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <Home className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 ${activeTab === 'home' ? 'scale-110' : ''}`} />
                <span className="text-[9px] sm:text-[10px] font-bold tracking-wide">Home</span>
              </button>

              <button 
                onClick={() => { setActiveTab('orders'); setSelectedOrderDetails(null); }}
                className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 ${activeTab === 'orders' ? 'bg-[#00FFFF]/10 text-[#00FFFF]' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <ShoppingBag className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 ${activeTab === 'orders' ? 'scale-110' : ''}`} />
                <span className="text-[9px] sm:text-[10px] font-bold tracking-wide">Orders</span>
              </button>
              
              <button 
                onClick={() => { setActiveTab('account'); setAccountView('main'); }}
                className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 ${activeTab === 'account' ? 'bg-[#00FFFF]/10 text-[#00FFFF]' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <UserCircle className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 ${activeTab === 'account' ? 'scale-110' : ''}`} />
                <span className="text-[9px] sm:text-[10px] font-bold tracking-wide">Account</span>
              </button>
            </div>
          </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Cart Drawer */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen} modal={false}>
        <SheetContent 
          side="right" 
          hideClose
          className="w-full sm:max-w-md bg-slate-950 border-gray-800 p-0 text-white flex flex-col z-[530] shadow-2xl shadow-black/50"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="p-4 border-b border-gray-800 bg-slate-900 flex items-center gap-3">
            <button onClick={() => {
              if (checkoutStep === 'payment') setCheckoutStep('address');
              else if (checkoutStep === 'address') setCheckoutStep('cart');
              else if (checkoutStep === 'add_address') setCheckoutStep('address');
              else setCartOpen(false);
            }} className="p-1 hover:bg-slate-800 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-300" />
            </button>
            <h2 className="text-lg font-bold">
              {checkoutStep === 'cart' ? `My Cart (${cart.reduce((sum, item) => sum + item.quantity, 0)})` : checkoutStep === 'add_address' ? 'Add New Address' : checkoutStep === 'address' ? 'Select Address' : 'Payment'}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-[#0a0a0c]">
            {checkoutStep === 'cart' && (
              cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <img src="https://cdn-icons-png.flaticon.com/512/11329/11329060.png" alt="Empty Cart" className="w-32 h-32 mb-6 opacity-80 filter invert" />
                <h3 className="text-xl font-bold text-white mb-2">Your cart is empty!</h3>
                <p className="text-gray-500 text-sm mb-6 max-w-[250px]">Add items to it now to grab the best deals before they are gone.</p>
                <Button onClick={() => setCartOpen(false)} className="bg-[#00FFFF] hover:bg-[#00FFFF]/80 text-black font-bold px-8">Shop Now</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.id} className="bg-slate-900 rounded-lg p-3 sm:p-4 border border-gray-800 flex gap-4 shadow-sm">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-900 rounded p-2 flex items-center justify-center shrink-0">
                      <img src={item.image} alt={item.name} className="max-h-full object-contain" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-medium text-sm sm:text-base line-clamp-2 text-white">{item.name}</h4>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="font-bold text-white">₹{item.price}</span>
                          <span className="text-xs text-gray-500 line-through">₹{item.originalPrice}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center border border-gray-700 rounded bg-slate-800">
                          <button onClick={() => updateQuantity(item.id, -1)} className="px-2 py-1 text-gray-400 hover:text-white disabled:opacity-50" disabled={item.quantity <= 1}><Minus className="w-3 h-3" /></button>
                          <span className="px-3 py-1 text-xs font-semibold border-x border-gray-700">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="px-2 py-1 text-gray-400 hover:text-white"><Plus className="w-3 h-3" /></button>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="text-sm font-semibold text-gray-400 hover:text-red-500 flex items-center gap-1 uppercase tracking-wide">
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Price Details */}
                <div className="bg-slate-900 rounded-lg p-4 border border-gray-800 mt-4 shadow-sm">
                  <h3 className="font-bold text-gray-400 uppercase text-xs tracking-wider mb-4 border-b border-gray-800 pb-3">Price Details</h3>
                  <div className="space-y-3 text-sm">
                    {/* Itemized Breakdown */}
                    {cart.length > 1 && (
                      <div className="pb-3 border-b border-gray-800 space-y-2">
                        {cart.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-gray-400 truncate pr-4">{item.quantity} x {item.name}</span>
                            <span className="text-gray-300 shrink-0">₹{item.originalPrice * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total MRP ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                      <span className="text-white font-medium">₹{cartOriginalTotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Discount on MRP</span>
                      <span className="text-green-600 font-medium">- ₹{totalDiscount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Delivery Charges</span>
                      <span className="text-green-600 font-medium">Free</span>
                    </div>
                    <div className="border-t border-dashed border-gray-800 pt-3 mt-3 flex justify-between">
                      <span className="font-bold text-base text-white">Total Amount</span>
                      <span className="font-bold text-base text-white">₹{cartTotal}</span>
                    </div>
                    <div className="text-green-600 text-xs font-bold pt-1">
                      You will save ₹{totalDiscount} on this order
                    </div>
                  </div>
                </div>
              </div>
              )
            )}
            
            {checkoutStep === 'address' && (
              <div className="space-y-4">
                {savedAddresses.length > 0 ? (
                  <>
                    <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-2">Saved Addresses</h3>
                    {savedAddresses.map(addr => (
                      <div 
                        key={addr.id} 
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`bg-slate-900 p-4 rounded-lg border cursor-pointer transition-all ${
                          (selectedAddressId === addr.id || (!selectedAddressId && addr.isDefault)) 
                            ? 'border-[#00FFFF] shadow-[0_0_10px_rgba(0,255,255,0.1)]' 
                            : 'border-gray-800 hover:border-gray-700'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{addr.name}</span>
                              {addr.isDefault && <Badge className="bg-[#00FFFF]/20 text-[#00FFFF] text-[10px] px-1 py-0 border-none">Default</Badge>}
                            </div>
                            <div className="text-sm text-gray-400 mt-1">{addr.street}</div>
                            <div className="text-sm text-gray-400">{addr.city}, {addr.state} - {addr.pincode}</div>
                            <div className="text-sm text-gray-300 mt-2 font-medium">📞 {addr.phone}</div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            (selectedAddressId === addr.id || (!selectedAddressId && addr.isDefault)) 
                              ? 'border-[#00FFFF]' 
                              : 'border-gray-600'
                          }`}>
                            {(selectedAddressId === addr.id || (!selectedAddressId && addr.isDefault)) && (
                              <div className="w-2.5 h-2.5 bg-[#00FFFF] rounded-full"></div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button 
                      onClick={() => setCheckoutStep('add_address')}
                      variant="outline" 
                      className="w-full border-dashed border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 bg-transparent h-12"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add New Address
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-gray-400">
                      <Home className="w-8 h-8" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2">No Address Found</h3>
                    <p className="text-gray-400 text-sm mb-6 max-w-[250px]">Please add a delivery address to proceed with your order.</p>
                    <Button 
                      onClick={() => setCheckoutStep('add_address')}
                      className="bg-[#00FFFF] text-black font-bold px-8 hover:bg-[#00FFFF]/80"
                    >
                      Add New Address
                    </Button>
                  </div>
                )}
              </div>
            )}

            {checkoutStep === 'add_address' && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!newAddress.name || !newAddress.phone || !newAddress.street || !newAddress.city || !newAddress.state || !newAddress.pincode) {
                  toast.error("Please fill all fields");
                  return;
                }
                try {
                  const isDefault = savedAddresses.length === 0;
                  const addrToSave = { ...newAddress, user_id: user?.id, isDefault };
                  const savedAddr = await UserAddress.create(addrToSave);
                  setSavedAddresses(prev => [...prev, savedAddr]);
                  setSelectedAddressId(savedAddr.id);
                  setNewAddress({ name: '', phone: '', street: '', city: '', state: '', pincode: '' });
                  toast.success("Address saved successfully!");
                  setCheckoutStep('address');
                } catch (err) {
                  console.error(err);
                  toast.error("Failed to save address");
                }
              }} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400">Full Name</label>
                  <Input value={newAddress.name} onChange={e => setNewAddress({...newAddress, name: e.target.value})} placeholder="John Doe" className="bg-slate-900 border-gray-800 text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400">Phone Number</label>
                  <Input value={newAddress.phone} onChange={e => setNewAddress({...newAddress, phone: e.target.value})} placeholder="+91 9876543210" className="bg-slate-900 border-gray-800 text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400">Street Address / House No.</label>
                  <Input value={newAddress.street} onChange={e => setNewAddress({...newAddress, street: e.target.value})} placeholder="123 Main St, Apartment 4B" className="bg-slate-900 border-gray-800 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400">City</label>
                    <Input value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} placeholder="Mumbai" className="bg-slate-900 border-gray-800 text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400">State</label>
                    <Input value={newAddress.state} onChange={e => setNewAddress({...newAddress, state: e.target.value})} placeholder="Maharashtra" className="bg-slate-900 border-gray-800 text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400">Pincode</label>
                  <Input value={newAddress.pincode} onChange={e => setNewAddress({...newAddress, pincode: e.target.value})} placeholder="400001" className="bg-slate-900 border-gray-800 text-white" />
                </div>
                
                <Button type="submit" className="w-full bg-[#00FFFF] hover:bg-[#00FFFF]/80 text-black font-bold mt-6 h-12">
                  Save Address & Continue
                </Button>
              </form>
            )}
            
            {checkoutStep === 'payment' && (
              <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center space-y-6">
                <div className="w-20 h-20 bg-[#00FFFF]/20 rounded-full flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(0,255,255,0.2)]">
                  <CreditCard className="w-10 h-10 text-[#00FFFF]" />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-white mb-2 tracking-wide">Complete Payment</h3>
                  <p className="text-gray-400 text-sm">Amount to Pay: <span className="text-[#00FFFF] font-bold text-xl">₹{cartTotal}</span></p>
                </div>
                
                <div className="w-full max-w-sm space-y-4 mt-6">
                  {/* Payment Mode Selection */}
                  {(storePaymentMethod === 'both' || storePaymentMethod === 'online') && (
                    <div 
                      onClick={() => setSelectedPaymentMode('online')}
                      className={`w-full p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${selectedPaymentMode === 'online' ? 'border-[#00FFFF] bg-[#00FFFF]/5' : 'border-gray-800 bg-slate-900 hover:border-gray-600'}`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedPaymentMode === 'online' ? 'border-[#00FFFF]' : 'border-gray-600'}`}>
                        {selectedPaymentMode === 'online' && <div className="w-2.5 h-2.5 bg-[#00FFFF] rounded-full"></div>}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-bold text-sm">Online Payment</h4>
                        <p className="text-xs text-gray-500">Credit Card, UPI, Wallets</p>
                      </div>
                      <Badge className="bg-[#00FFFF]/20 text-[#00FFFF] border-none text-[10px]">Secure</Badge>
                    </div>
                  )}

                  {(storePaymentMethod === 'both' || storePaymentMethod === 'cod') && (
                    <div 
                      onClick={() => setSelectedPaymentMode('cod')}
                      className={`w-full p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${selectedPaymentMode === 'cod' ? 'border-[#00FFFF] bg-[#00FFFF]/5' : 'border-gray-800 bg-slate-900 hover:border-gray-600'}`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedPaymentMode === 'cod' ? 'border-[#00FFFF]' : 'border-gray-600'}`}>
                        {selectedPaymentMode === 'cod' && <div className="w-2.5 h-2.5 bg-[#00FFFF] rounded-full"></div>}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-bold text-sm">Cash on Delivery</h4>
                        <p className="text-xs text-gray-500">Pay when you receive</p>
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={() => handlePayment(selectedPaymentMode)} 
                    disabled={isCheckingOut}
                    className="w-full h-14 bg-gradient-to-r from-[#00FFFF] to-[#00bfff] text-black font-bold text-lg hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] transition-all uppercase tracking-widest mt-6"
                  >
                    {isCheckingOut ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </span>
                    ) : (
                      selectedPaymentMode === 'cod' ? "Place Order" : `Pay ₹${cartTotal}`
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Checkout Footer */}
          {cart.length > 0 && checkoutStep === 'cart' && (
            <div className="p-4 bg-slate-900 border-t border-gray-800 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
              <div>
                <p className="text-xl font-bold text-white">₹{cartTotal}</p>
                <p className="text-xs text-gray-400">Total Amount</p>
              </div>
              <Button 
                onClick={handleCheckout} 
                className="bg-[#00FFFF] hover:bg-[#00FFFF]/80 text-black font-bold px-8 h-12 w-48 text-base shadow-sm"
              >
                Checkout
              </Button>
            </div>
          )}

          {cart.length > 0 && checkoutStep === 'address' && savedAddresses.length > 0 && (
            <div className="p-4 bg-slate-900 border-t border-gray-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
              <Button 
                onClick={() => setCheckoutStep('payment')} 
                className="w-full bg-[#00FFFF] hover:bg-[#00FFFF]/80 text-black font-bold h-12 text-base shadow-sm"
              >
                Continue to Payment
              </Button>
            </div>
          )}
          
        </SheetContent>
      </Sheet>

      {createPortal(
        <AnimatePresence>
          {fullScreenImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[99999] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
              onClick={() => setFullScreenImage(null)}
            >
              <button 
                className="absolute top-4 right-4 bg-gray-900/50 text-white rounded-full p-3 hover:bg-gray-800 transition-colors z-[99999]"
                onClick={() => setFullScreenImage(null)}
              >
                <X className="w-6 h-6" />
              </button>

              {fullScreenImage.images.length > 1 && (
                <>
                  <button 
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-gray-900/50 text-white rounded-full p-3 hover:bg-gray-800 transition-colors z-[99999]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFullScreenImage(prev => ({ ...prev, index: prev.index === 0 ? prev.images.length - 1 : prev.index - 1 }));
                    }}
                  >
                    <ChevronLeft className="w-8 h-8" />
                  </button>
                  <button 
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-gray-900/50 text-white rounded-full p-3 hover:bg-gray-800 transition-colors z-[99999]"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFullScreenImage(prev => ({ ...prev, index: (prev.index + 1) % prev.images.length }));
                    }}
                  >
                    <ChevronRight className="w-8 h-8" />
                  </button>
                </>
              )}

              <AnimatePresence mode="wait">
                <motion.img 
                  key={fullScreenImage.index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  src={fullScreenImage.images[fullScreenImage.index]} 
                  alt="Full Screen" 
                  className="max-w-full max-h-[85vh] object-contain rounded-md"
                  onClick={(e) => e.stopPropagation()}
                />
              </AnimatePresence>

              {fullScreenImage.images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm font-medium bg-black/50 px-4 py-1.5 rounded-full">
                  {fullScreenImage.index + 1} / {fullScreenImage.images.length}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
