import React, { useState, useEffect } from "react";
import { Product, SellRequest, UserAddress, UserOrder, UserWishlist, User, StoreBanner } from "@/api/entities";
import { AppSettings } from "@/entities/AppSettings";
import { UploadFile } from "@/integrations/Core";
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X, Upload, Trash2, Edit, ShoppingCart, DollarSign, Package, Search, MapPin, Heart, Clock, Link2, Settings } from "lucide-react";
import { format } from "date-fns";

export default function StoreManagement() {
  const [products, setProducts] = useState([]);
  const [sellRequests, setSellRequests] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // User Search State
  const [searchUid, setSearchUid] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchedUser, setSearchedUser] = useState(null);
  const [userAddresses, setUserAddresses] = useState([]);
  const [userOrders, setUserOrders] = useState([]);
  const [userWishlists, setUserWishlists] = useState([]);
  const [userSellRequests, setUserSellRequests] = useState([]);
  
  // Store Banners State
  const [banners, setBanners] = useState([]);
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [bannerFormData, setBannerFormData] = useState({
    title: "",
    subtitle: "",
    link_url: "",
    image_url: ""
  });
  const [crop, setCrop] = useState({ unit: '%', width: 100, aspect: 16 / 9 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [upImg, setUpImg] = useState();
  const [imgRef, setImgRef] = useState(null);
  const [cropping, setCropping] = useState(false);
  
  // Product Form State
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    price: "",
    originalPrice: "",
    description: "",
    images: [],
    inStock: true,
    rating: "",
    reviews: "",
    tags: ""
  });

  // Settings State
  const [paymentSetting, setPaymentSetting] = useState('both');
  const [enableSellerOnboarding, setEnableSellerOnboarding] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    loadData();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [paymentSet, onboardingSet] = await Promise.all([
        AppSettings.filter({ setting_key: "store_payment_method" }),
        AppSettings.filter({ setting_key: "enable_seller_onboarding" })
      ]);
      if (paymentSet && paymentSet.length > 0) {
        setPaymentSetting(paymentSet[0].setting_value || 'both');
      }
      if (onboardingSet && onboardingSet.length > 0) {
        setEnableSellerOnboarding(onboardingSet[0].setting_value === 'true');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const [paymentSet, onboardingSet] = await Promise.all([
        AppSettings.filter({ setting_key: "store_payment_method" }),
        AppSettings.filter({ setting_key: "enable_seller_onboarding" })
      ]);
      
      const updates = [];
      
      if (paymentSet && paymentSet.length > 0) {
        updates.push(AppSettings.update(paymentSet[0].id, { setting_value: paymentSetting }));
      } else {
        updates.push(AppSettings.create({ setting_key: "store_payment_method", setting_value: paymentSetting, is_enabled: true }));
      }

      if (onboardingSet && onboardingSet.length > 0) {
        updates.push(AppSettings.update(onboardingSet[0].id, { setting_value: enableSellerOnboarding ? 'true' : 'false' }));
      } else {
        updates.push(AppSettings.create({ setting_key: "enable_seller_onboarding", setting_value: enableSellerOnboarding ? 'true' : 'false', is_enabled: true }));
      }

      await Promise.all(updates);
      alert("Settings saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save settings");
    }
    setSavingSettings(false);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, reqs, orders, bns] = await Promise.all([
        Product.list('-created_date'),
        SellRequest.list('-created_date'),
        UserOrder.list('-created_date', 50),
        StoreBanner.list('-created_date', 5)
      ]);
      setProducts(prods || []);
      setSellRequests(reqs || []);
      setRecentOrders(orders || []);
      setBanners(bns || []);
    } catch (err) {
      console.error("Failed to load store data", err);
    }
    setLoading(false);
  };

  const handleSearchUser = async (e) => {
    e.preventDefault();
    if (!searchUid.trim()) return;
    
    setSearchLoading(true);
    setSearchedUser(null);
    try {
      const usersByUid = await User.filter({ unique_id: searchUid.trim() });
      let foundUser = usersByUid && usersByUid.length > 0 ? usersByUid[0] : null;
      
      if (!foundUser) {
        const usersById = await User.filter({ id: searchUid.trim() }).catch(()=>[]);
        if (usersById && usersById.length > 0) {
          foundUser = usersById[0];
        }
      }

      if (foundUser) {
        setSearchedUser(foundUser);
        const [addresses, orders, wishlists, sReqs] = await Promise.all([
          UserAddress.filter({ user_id: foundUser.id }).catch(() => []),
          UserOrder.filter({ user_id: foundUser.id }).catch(() => []),
          UserWishlist.filter({ user_id: foundUser.id }).catch(() => []),
          SellRequest.filter({ user_id: foundUser.id }).catch(() => [])
        ]);
        setUserAddresses(addresses || []);
        setUserOrders(orders || []);
        setUserWishlists(wishlists || []);
        setUserSellRequests(sReqs || []);
      } else {
        alert("User not found with this UID.");
      }
    } catch (err) {
      console.error("Error searching user", err);
      alert("Error searching for user.");
    }
    setSearchLoading(false);
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (formData.images && formData.images.length + files.length > 8) {
      alert("You can upload a maximum of 8 images per product.");
      return;
    }

    setUploading(true);
    try {
      const uploadPromises = files.map(file => UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map(r => r.file_url);
      
      const updatedImages = [...(formData.images || []), ...newUrls];
      
      setFormData({ 
        ...formData, 
        images: updatedImages,
        image: updatedImages[0] // Set first image as primary fallback
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image.");
    }
    setUploading(false);
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await UploadFile({ file });
      setFormData({ 
        ...formData, 
        video_url: result.file_url 
      });
      alert("Video uploaded successfully!");
    } catch (error) {
      console.error("Error uploading video:", error);
      alert("Failed to upload video.");
    }
    setUploading(false);
  };

  const removeImage = (index) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      images: newImages,
      image: newImages.length > 0 ? newImages[0] : ""
    });
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price || !formData.image) {
      alert("Name, Price, and Image are required.");
      return;
    }

    const payload = {
      ...formData,
      price: Number(formData.price),
      originalPrice: Number(formData.originalPrice) || Number(formData.price),
      rating: Number(formData.rating) || 5.0,
      reviews: Number(formData.reviews) || 0
    };

    try {
      if (editingProduct) {
        await Product.update(editingProduct.id, payload);
      } else {
        await Product.create(payload);
      }
      setShowProductForm(false);
      setEditingProduct(null);
      resetForm();
      loadData();
    } catch (err) {
      console.error("Failed to save product", err);
      alert("Failed to save product.");
    }
  };

  const onSelectFile = e => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setUpImg(reader.result));
      reader.readAsDataURL(e.target.files[0]);
      setCropping(true);
    }
  };

  const onImageLoad = (e) => {
    setImgRef(e.currentTarget);
  };

  const getCroppedImg = (image, crop, fileName) => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        blob.name = fileName;
        const fileUrl = window.URL.createObjectURL(blob);
        resolve({ blob, fileUrl });
      }, 'image/jpeg');
    });
  };

  const handleCropComplete = async () => {
    if (!completedCrop || !imgRef || completedCrop.width <= 0) return;
    try {
      setUploading(true);
      const { blob } = await getCroppedImg(imgRef, completedCrop, 'cropped.jpg');
      const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
      const { file_url } = await UploadFile({ file });
      setBannerFormData({ ...bannerFormData, image_url: file_url });
      setCropping(false);
      setUpImg(null);
    } catch (e) {
      console.error(e);
      alert("Error cropping image");
    } finally {
      setUploading(false);
    }
  };

  const handleBannerSubmit = async (e) => {
    e.preventDefault();
    if (!bannerFormData.image_url) {
      alert("Please upload and crop a banner image");
      return;
    }
    if (banners.length >= 5) {
      alert("Maximum 5 banners allowed. Please delete one first.");
      return;
    }
    setUploading(true);
    try {
      await StoreBanner.create({
        ...bannerFormData,
        created_date: new Date().toISOString()
      });
      setShowBannerForm(false);
      setBannerFormData({ title: "", subtitle: "", link_url: "", image_url: "" });
      loadData();
    } catch(err) {
      console.error(err);
      alert("Failed to add banner");
    }
    setUploading(false);
  };
  
  const deleteBanner = async (id) => {
    if (!window.confirm("Delete this banner?")) return;
    try {
      await StoreBanner.delete(id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const editProduct = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || "",
      description: product.description || "",
      price: product.price || "",
      originalPrice: product.originalPrice || "",
      category: product.category || "merch",
      creator: product.creator || "",
      image: product.image || "",
      rating: product.rating || 5.0,
      reviews: product.reviews || 0
    });
    setShowProductForm(true);
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await Product.delete(id);
      loadData();
    } catch (err) {
      console.error("Failed to delete product", err);
    }
  };

  const updateSellRequestStatus = async (id, status) => {
    try {
      await SellRequest.update(id, { status });
      loadData();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      originalPrice: "",
      category: "merch",
      creator: "",
      image: "",
      images: [],
      rating: 5.0,
      reviews: 0
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-slate-900/40 p-6 rounded-2xl border border-slate-800/50 backdrop-blur-sm shadow-xl">
        <div>
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#00FFFF] to-orange-500 flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-[#00FFFF]" />
            Store & Commerce
          </h2>
          <p className="text-gray-400 mt-1">Manage store products, banners, and user sell requests</p>
        </div>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="bg-slate-900/50 backdrop-blur-md border border-slate-700/50 flex flex-wrap h-auto gap-2 p-1.5 rounded-xl justify-start shadow-lg mb-4">
          <TabsTrigger value="products" className="flex-1 min-w-[140px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00FFFF] data-[state=active]:to-orange-500 data-[state=active]:text-black data-[state=active]:shadow-md rounded-lg transition-all font-medium">Products Inventory</TabsTrigger>
          <TabsTrigger value="requests" className="flex-1 min-w-[140px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00FFFF] data-[state=active]:to-orange-500 data-[state=active]:text-black data-[state=active]:shadow-md rounded-lg transition-all font-medium">User Sell Requests</TabsTrigger>
          <TabsTrigger value="activity" className="flex-1 min-w-[140px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00FFFF] data-[state=active]:to-orange-500 data-[state=active]:text-black data-[state=active]:shadow-md rounded-lg transition-all font-medium">Orders & Activity</TabsTrigger>
          <TabsTrigger value="banners" className="flex-1 min-w-[140px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00FFFF] data-[state=active]:to-orange-500 data-[state=active]:text-black data-[state=active]:shadow-md rounded-lg transition-all font-medium">Store Banners</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 min-w-[140px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#00FFFF] data-[state=active]:to-orange-500 data-[state=active]:text-black data-[state=active]:shadow-md rounded-lg transition-all font-medium">Settings</TabsTrigger>
        </TabsList>

        {/* PRODUCTS TAB */}
        <TabsContent value="products" className="mt-6 space-y-4">
          {!showProductForm ? (
            <div className="flex justify-end">
              <Button onClick={() => { resetForm(); setEditingProduct(null); setShowProductForm(true); }} className="bg-[#00FFFF] text-black hover:bg-[#00FFFF]/80">
                <Plus className="w-4 h-4 mr-2" /> Add New Product
              </Button>
            </div>
          ) : (
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
                <CardTitle>{editingProduct ? "Edit Product" : "Add New Product"}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => { setShowProductForm(false); setEditingProduct(null); }}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleProductSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Product Name</Label>
                      <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. BATTLEHUB FF Gaming Mouse" className="bg-slate-800 border-slate-700" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full h-10 px-3 py-2 rounded-md bg-slate-800 border border-slate-700 text-sm">
                        <option value="merch">Merchandise</option>
                        <option value="gear">Gaming Gear</option>
                        <option value="coins">BattleHub Coins</option>
                        <option value="pass">Tournament Pass</option>
                        <option value="giftcards">Gift Cards</option>
                        <option value="accessories">Accessories</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Selling Price (₹)</Label>
                      <Input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="499" className="bg-slate-800 border-slate-700" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Original Price (₹)</Label>
                      <Input type="number" value={formData.originalPrice} onChange={e => setFormData({...formData, originalPrice: e.target.value})} placeholder="999" className="bg-slate-800 border-slate-700" />
                    </div>
                    <div className="space-y-2">
                      <Label>Creator / Brand (Optional)</Label>
                      <Input value={formData.creator} onChange={e => setFormData({...formData, creator: e.target.value})} placeholder="e.g. Psycho Shayar" className="bg-slate-800 border-slate-700" />
                    </div>
                    <div className="space-y-2">
                      <Label>Product Images (Max 8)</Label>
                      <div className="flex gap-2">
                        <Input type="file" accept="image/*" multiple onChange={handleImageUpload} className="bg-slate-800 border-slate-700 flex-1" />
                        {uploading && <div className="flex items-center px-2 text-sm text-[#00FFFF]">Uploading...</div>}
                      </div>
                      {formData.images && formData.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {formData.images.map((imgUrl, idx) => (
                            <div key={idx} className="relative w-16 h-16 border border-slate-700 bg-slate-900 p-1 rounded">
                              <img src={imgUrl} alt={`Preview ${idx}`} className="w-full h-full object-cover rounded" />
                              <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-sm"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Description</Label>
                      <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Detailed product description..." className="bg-slate-800 border-slate-700" rows={3} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Product Video URL (Optional)</Label>
                      <div className="flex gap-2">
                        <Input value={formData.video_url || ''} onChange={e => setFormData({...formData, video_url: e.target.value})} placeholder="Enter direct video URL (.mp4, .webm) or YouTube embed link" className="bg-slate-800 border-slate-700 flex-1" />
                        <Input type="file" accept="video/mp4,video/webm" onChange={handleVideoUpload} className="bg-slate-800 border-slate-700 w-auto" />
                      </div>
                    </div>
                  </div>
                  <Button type="submit" disabled={uploading} className="w-full bg-[#00FFFF] text-black hover:bg-[#00FFFF]/80 mt-4 font-bold">
                    {editingProduct ? "Update Product" : "Create Product"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(product => (
              <Card key={product.id} className="bg-slate-900/80 backdrop-blur-sm border-slate-700/50 overflow-hidden text-white flex flex-col group hover:shadow-2xl hover:shadow-[#00FFFF]/10 hover:-translate-y-1 transition-all duration-300 rounded-2xl">
                <div className="h-48 bg-gradient-to-b from-slate-800/50 to-slate-900 p-4 flex items-center justify-center relative overflow-hidden">
                   <img src={product.image} alt={product.name} className="max-h-full object-contain group-hover:scale-110 transition-transform duration-500 drop-shadow-lg" />
                   {product.originalPrice > product.price && (
                     <Badge className="absolute top-3 left-3 bg-green-500 text-white border-none font-bold shadow-md">
                       {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                     </Badge>
                   )}
                   <Badge className="absolute top-3 right-3 bg-black/60 backdrop-blur-md border-slate-700 uppercase text-[10px] tracking-wider">{product.category}</Badge>
                </div>
                <CardContent className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg line-clamp-1 group-hover:text-[#00FFFF] transition-colors">{product.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[#00FFFF] font-extrabold text-xl">₹{product.price}</span>
                    {product.originalPrice > product.price && <span className="text-gray-500 line-through text-sm">₹{product.originalPrice}</span>}
                  </div>
                  <div className="flex gap-3 mt-auto pt-5 border-t border-slate-800/50">
                    <Button variant="outline" size="sm" onClick={() => editProduct(product)} className="flex-1 bg-slate-800/50 border-slate-600 hover:bg-[#00FFFF] hover:text-black hover:border-[#00FFFF] transition-all font-semibold">
                      <Edit className="w-4 h-4 mr-2" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteProduct(product.id)} className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/30 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!loading && products.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500 bg-slate-900 rounded-lg border border-slate-800">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No products found in the store.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* SELL REQUESTS TAB */}
        <TabsContent value="requests" className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sellRequests.map(request => (
              <Card key={request.id} className="bg-slate-900 border-slate-800 text-white">
                <CardHeader className="pb-2 border-b border-slate-800">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base font-bold text-[#00FFFF]">{request.name}</CardTitle>
                    <Badge variant={request.status === 'approved' ? 'default' : request.status === 'rejected' ? 'destructive' : 'secondary'} className={request.status === 'approved' ? 'bg-green-500' : ''}>
                      {request.status?.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400">Category: {request.category}</p>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div>
                    <Label className="text-xs text-gray-500">Expected Price</Label>
                    <p className="font-bold text-lg">₹{request.expectedPrice}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Description</Label>
                    <p className="text-sm bg-slate-950 p-2 rounded-md mt-1 border border-slate-800 line-clamp-3">{request.description}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">User ID</Label>
                    <p className="text-xs font-mono text-gray-400 truncate">{request.user_id}</p>
                  </div>
                  {request.status === 'pending' && (
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={() => updateSellRequestStatus(request.id, 'approved')} className="flex-1 bg-green-500 hover:bg-green-600 text-white">Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => updateSellRequestStatus(request.id, 'rejected')} className="flex-1">Reject</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {!loading && sellRequests.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-500 bg-slate-900 rounded-lg border border-slate-800">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No user sell requests received yet.</p>
              </div>
            )}
          </div>
        </TabsContent>

          {/* ACTIVITY TAB */}
          <TabsContent value="activity" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
              
              {/* Global Orders Feed */}
              <Card className="bg-slate-900/50 backdrop-blur-xl border-slate-800/80 shadow-2xl text-white rounded-2xl overflow-hidden flex flex-col h-auto xl:h-[650px]">
              <CardHeader className="bg-slate-900/80 border-b border-slate-800/80 px-6 py-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-lg font-semibold tracking-wide">
                    <div className="p-2 bg-cyan-500/10 rounded-lg">
                      <Clock className="w-5 h-5 text-cyan-400" />
                    </div>
                    Global Orders Feed
                  </CardTitle>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-500/5 backdrop-blur-sm">Live</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[650px] overflow-y-auto px-4 py-4 space-y-4">
                  {recentOrders.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                      <Package className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-sm font-medium">No recent orders found in the system.</p>
                    </div>
                  )}
                  {recentOrders.map(order => (
                    <div key={order.id} className="group relative bg-slate-800/40 hover:bg-slate-800/80 transition-all duration-300 p-4 rounded-xl border border-slate-700/30 hover:border-cyan-500/30 flex flex-col gap-3">
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-500/5 rounded-xl transition-all duration-500" />
                      <div className="relative flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm tracking-wide text-white">Order #{order.id.slice(-6).toUpperCase()}</span>
                            <Badge className="bg-slate-900 border-slate-700 text-[9px] text-slate-300 px-1.5 py-0">NEW</Badge>
                          </div>
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                            User ID: <span className="font-mono font-medium text-cyan-300/80 bg-cyan-500/10 px-1.5 py-0.5 rounded">{order.user_id?.slice(0,10)}...</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-lg text-emerald-400 tracking-tight">₹{order.total_amount}</p>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">{format(new Date(order.created_at || order.created_date), 'dd MMM yyyy, hh:mm a')}</p>
                        </div>
                      </div>
                      <div className="relative pt-3 border-t border-slate-700/30">
                        {order.items && order.items.map((item, i) => (
                           <div key={i} className="flex justify-between items-center text-xs text-slate-300 py-1">
                             <span className="font-medium">{item.name}</span>
                             <span className="text-slate-500 bg-slate-900/50 px-2 py-0.5 rounded-full font-medium">x{item.quantity}</span>
                           </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* User Search & Full Report */}
            <Card className="bg-slate-900/50 backdrop-blur-xl border-slate-800/80 shadow-2xl text-white rounded-2xl overflow-hidden flex flex-col h-full">
              <CardHeader className="bg-slate-900/80 border-b border-slate-800/80 px-6 py-5">
                <CardTitle className="flex items-center gap-3 text-lg font-semibold tracking-wide">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <Search className="w-5 h-5 text-indigo-400" />
                  </div>
                  User Store Lookup
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 flex-1 flex flex-col">
                <form onSubmit={handleSearchUser} className="flex flex-col sm:flex-row gap-3 mb-6 sm:mb-8">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input 
                      value={searchUid} 
                      onChange={e => setSearchUid(e.target.value)} 
                      placeholder="Enter exact User ID to lookup..." 
                      className="pl-10 h-12 bg-slate-950/50 border-slate-700/50 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all rounded-xl text-white placeholder:text-slate-500 shadow-inner"
                    />
                  </div>
                  <Button type="submit" disabled={searchLoading} className="h-12 w-full sm:w-auto px-8 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold shadow-lg shadow-red-500/20 transition-all">
                    {searchLoading ? "Searching..." : "Lookup"}
                  </Button>
                </form>

                {searchedUser ? (
                  <div className="space-y-8 flex-1 overflow-y-auto pr-4">
                    
                    {/* User Profile Header */}
                    <div className="flex items-center gap-4 p-4 bg-slate-800/40 rounded-xl border border-slate-700/30">
                      <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl font-bold text-indigo-400">{searchedUser.ign?.[0]?.toUpperCase() || 'U'}</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white tracking-wide">{searchedUser.ign || searchedUser.full_name}</h3>
                        <p className="text-xs text-indigo-300 font-mono mt-0.5">{searchedUser.unique_id}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Addresses */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                          <MapPin className="w-4 h-4 text-orange-500" /> Saved Addresses
                        </h4>
                        {userAddresses.length === 0 ? <p className="text-slate-600 text-xs font-medium">No saved addresses.</p> : (
                          <div className="space-y-2">
                            {userAddresses.map((addr) => (
                              <div key={addr.id} className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/30 hover:border-orange-600/30 transition-colors">
                                <p className="font-semibold text-sm text-slate-200">{addr.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{addr.phone}</p>
                                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{addr.address}, {addr.city}, {addr.state} - {addr.pincode}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Purchase History */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                          <Package className="w-4 h-4 text-emerald-400" /> Purchases
                        </h4>
                        {userOrders.length === 0 ? <p className="text-slate-600 text-xs font-medium">No purchase history.</p> : (
                          <div className="space-y-2">
                            {userOrders.map((order) => (
                              <div key={order.id} className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/30 hover:border-emerald-500/30 transition-colors flex justify-between items-center">
                                <div>
                                  <p className="font-bold text-xs text-emerald-400 uppercase tracking-wide">#{order.id.slice(-6)}</p>
                                  <p className="text-[10px] text-slate-500 font-medium mt-1">{format(new Date(order.created_at || order.created_date), 'dd MMM yy')}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-black text-emerald-400 text-sm">₹{order.total_amount}</p>
                                  <Badge className="mt-1 text-[9px] bg-slate-900 border-slate-700 text-slate-400">{order.status || 'Pending'}</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Wishlist */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                          <Heart className="w-4 h-4 text-rose-400" /> Wishlist
                        </h4>
                        {userWishlists.length === 0 ? <p className="text-slate-600 text-xs font-medium">Wishlist is empty.</p> : (
                          <div className="space-y-2">
                            {userWishlists.map((w) => (
                              <div key={w.id} className="bg-slate-800/30 p-2 rounded-lg border border-slate-700/30 hover:border-rose-500/30 transition-colors flex items-center gap-3">
                                 <div className="w-10 h-10 bg-slate-900 rounded-md flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                                   {w.product_image ? <img src={w.product_image} className="w-full h-full object-cover" alt="prod" /> : <ShoppingCart className="w-4 h-4 text-slate-600" />}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                   <p className="text-xs font-bold text-slate-200 truncate">{w.product_name}</p>
                                   <p className="text-[11px] font-black text-rose-400 mt-0.5">₹{w.product_price}</p>
                                 </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Sell Requests */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                          <DollarSign className="w-4 h-4 text-amber-400" /> Sell Requests
                        </h4>
                        {userSellRequests.length === 0 ? <p className="text-slate-600 text-xs font-medium">No sell requests.</p> : (
                          <div className="space-y-2">
                            {userSellRequests.map((req) => (
                              <div key={req.id} className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/30 hover:border-amber-500/30 transition-colors flex justify-between items-start">
                                 <div>
                                   <p className="font-bold text-xs text-slate-200">{req.product_name}</p>
                                   <p className="text-[10px] text-slate-500 font-medium mt-1">{format(new Date(req.created_at || req.created_date), 'dd MMM yy')}</p>
                                 </div>
                                 <div className="text-right">
                                   <p className="text-xs font-black text-amber-400">₹{req.expected_price}</p>
                                   <Badge className="mt-1 text-[9px] bg-slate-900 border-slate-700 text-slate-400">{req.status}</Badge>
                                 </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-500">
                    <div className="w-20 h-20 bg-slate-900/50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-slate-800/50">
                      <Search className="w-8 h-8 opacity-40 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-300 mb-2">No User Selected</h3>
                    <p className="text-sm font-medium text-slate-500 text-center max-w-[250px]">Enter a User ID in the search bar above to generate their complete store report.</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
          </TabsContent>

        {/* BANNERS TAB */}
        <TabsContent value="banners" className="mt-6 space-y-6">
          {!showBannerForm ? (
            <div className="flex justify-end">
              <Button 
                onClick={() => {
                  if (banners.length >= 5) {
                    alert("Max 5 banners allowed");
                    return;
                  }
                  setShowBannerForm(true);
                }} 
                className="bg-[#00FFFF] text-black hover:bg-[#00FFFF]/80"
              >
                <Plus className="w-4 h-4 mr-2" /> Add New Banner ({banners.length}/5)
              </Button>
            </div>
          ) : (
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-800 pb-4">
                <CardTitle>Add New Banner</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => { setShowBannerForm(false); setUpImg(null); }}>
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleBannerSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Title (Optional)</Label>
                      <Input value={bannerFormData.title} onChange={e => setBannerFormData({...bannerFormData, title: e.target.value})} placeholder="e.g. Creator Merch Drop" className="bg-slate-800 border-slate-700" />
                    </div>
                    <div className="space-y-2">
                      <Label>Subtitle (Optional)</Label>
                      <Input value={bannerFormData.subtitle} onChange={e => setBannerFormData({...bannerFormData, subtitle: e.target.value})} placeholder="e.g. Support your favorite streamers" className="bg-slate-800 border-slate-700" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Explore Now Link (In-app URL)</Label>
                      <Input value={bannerFormData.link_url} onChange={e => setBannerFormData({...bannerFormData, link_url: e.target.value})} placeholder="e.g. /product/12345" className="bg-slate-800 border-slate-700" />
                      <p className="text-xs text-gray-500">To link a product, enter /product/PRODUCT_ID here.</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Upload Banner Image (16:9 Landscape)</Label>
                    <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center cursor-pointer hover:bg-slate-800/50 relative overflow-hidden transition-colors">
                      <input type="file" accept="image/*" onChange={onSelectFile} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Upload className="w-8 h-8 text-gray-400" />
                        <span className="text-sm text-gray-400">Click to upload and crop</span>
                      </div>
                    </div>
                  </div>

                  {upImg && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg text-white">Crop Image</h3>
                      <div className="bg-slate-800 p-2 rounded-lg max-h-[500px] overflow-auto">
                        <ReactCrop
                          crop={crop}
                          onChange={c => setCrop(c)}
                          onComplete={c => setCompletedCrop(c)}
                          aspect={16 / 9}
                        >
                          <img src={upImg} onLoad={onImageLoad} alt="Upload" />
                        </ReactCrop>
                      </div>
                      <div className="flex gap-2 justify-end mt-4">
                        <Button type="button" variant="outline" onClick={() => setUpImg(null)}>Cancel Crop</Button>
                        <Button type="button" onClick={handleCropComplete} disabled={uploading}>
                          {uploading ? "Cropping..." : "Save Crop"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {bannerFormData.image_url && !upImg && (
                    <div className="mt-4">
                      <Label>Final Banner Image</Label>
                      <img src={bannerFormData.image_url} alt="Cropped" className="w-full h-auto mt-2 rounded-lg border border-slate-700" />
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                    <Button variant="ghost" onClick={() => setShowBannerForm(false)}>Cancel</Button>
                    <Button type="submit" className="bg-[#00FFFF] text-black hover:bg-[#00FFFF]/80" disabled={uploading}>
                      {uploading ? "Uploading..." : "Save Banner"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4">
            {banners.map((banner) => (
              <Card key={banner.id} className="bg-slate-900 border-slate-800 text-white overflow-hidden">
                <div className="flex flex-col md:flex-row h-full">
                  <div className="w-full md:w-1/3 aspect-video bg-slate-800 flex-shrink-0">
                    <img src={banner.image_url} alt="Banner" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-center relative">
                    <h3 className="text-xl font-bold">{banner.title || "No Title"}</h3>
                    <p className="text-gray-400 mt-1">{banner.subtitle || "No Subtitle"}</p>
                    <p className="text-sm text-cyan-400 mt-2 flex items-center gap-2">
                      <Link2 className="w-4 h-4" /> {banner.link_url || "No link"}
                    </p>
                    
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => deleteBanner(banner.id)}
                      className="absolute top-4 right-4"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {banners.length === 0 && !showBannerForm && (
              <div className="text-center py-12 text-slate-500">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No banners added yet. Add up to 5 banners to display on the store.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-6 space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-400" />
                Payment Method Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-400">Available Payment Methods</Label>
                  <select 
                    value={paymentSetting}
                    onChange={(e) => setPaymentSetting(e.target.value)}
                    className="w-full mt-2 bg-slate-950 border border-gray-800 text-white rounded-md h-10 px-3"
                  >
                    <option value="both">Both (Online + Cash on Delivery)</option>
                    <option value="online">Online Only (Razorpay)</option>
                    <option value="cod">Cash on Delivery Only</option>
                  </select>
                </div>
                
                <div className="pt-4 border-t border-gray-800">
                  <h4 className="text-white font-bold mb-4">Seller Program Settings</h4>
                  <div className="flex items-center justify-between bg-slate-950 p-4 rounded-lg border border-gray-800">
                    <div>
                      <p className="text-white font-medium">Enable "Become a Seller"</p>
                      <p className="text-sm text-gray-400">Allow users to register as sellers. When disabled, the registration form is hidden.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={enableSellerOnboarding}
                        onChange={(e) => setEnableSellerOnboarding(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00FFFF]"></div>
                    </label>
                  </div>
                </div>

                <Button 
                  onClick={saveSettings} 
                  disabled={savingSettings}
                  className="bg-[#00FFFF] text-black font-bold hover:bg-[#00FFFF]/80"
                >
                  {savingSettings ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
