import React, { useState, useEffect, useRef } from "react";
import { Blog } from "@/entities/Blog";
import { cacheInvalidateAll } from "@/lib/cache";
import { UploadFile } from "@/integrations/Core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText, Plus, Search, Edit3, Trash2, Globe, Eye,
  Upload, Check, X, ArrowLeft, Image as ImageIcon, Video,
  Link as LinkIcon, HelpCircle, Sparkles, AlertCircle,
  Clock, Calendar, User, Tag, Share2, Bold, Italic,
  Heading1, Heading2, Heading3, List, ListOrdered, Quote, Table,
  CheckCircle2, ExternalLink, RotateCw
} from "lucide-react";

const toast = {
  success: (msg) => {
    if (typeof document === "undefined") return;
    const el = document.createElement("div");
    el.className = "fixed bottom-5 right-5 z-[9999] bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2";
    el.innerText = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); }, 3000);
  },
  error: (msg) => {
    if (typeof document === "undefined") return;
    const el = document.createElement("div");
    el.className = "fixed bottom-5 right-5 z-[9999] bg-red-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2";
    el.innerText = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.remove(); }, 3500);
  }
};

const CATEGORIES = [
  "Guides",
  "Esports News",
  "Free Fire MAX",
  "BGMI Scrims",
  "Tournament Tips",
  "Product Updates",
  "Community"
];

export default function BlogManagement() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isEditing, setIsEditing] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  // AWS Upload states
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverUploadProgress, setCoverUploadProgress] = useState(0);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaUploadProgress, setMediaUploadProgress] = useState(0);

  // Form State
  const [formData, setFormData] = useState({
    id: null,
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    cover_image: "",
    cover_image_alt: "",
    category: "Guides",
    tags: [],
    author_name: "BattleHub Editorial",
    author_role: "Esports Team",
    read_time: "5 min read",
    status: "published", // "draft" | "published"
    focus_keyword: "",
    meta_title: "",
    meta_description: "",
    faqs: [], // [{ q: "", a: "" }]
    featured: false
  });

  const [tagInput, setTagInput] = useState("");
  const contentTextareaRef = useRef(null);

  useEffect(() => {
    loadBlogs();
  }, []);

  const loadBlogs = async (forceRefresh = false) => {
    setLoading(true);
    try {
      if (forceRefresh) {
        cacheInvalidateAll();
      }
      const docs = await Blog.list("-created_date");
      setBlogs(docs || []);
    } catch (err) {
      console.error("Error loading blogs:", err);
      toast.error("Failed to load blogs from database");
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate slug from title
  const handleTitleChange = (val) => {
    const slug = val
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");

    setFormData((prev) => ({
      ...prev,
      title: val,
      slug: prev.id ? prev.slug : slug,
      meta_title: prev.meta_title ? prev.meta_title : `${val} | BattleHub`,
      meta_description: prev.meta_description ? prev.meta_description : prev.excerpt
    }));
  };

  // Auto-calculate read time from content
  const handleContentChange = (val) => {
    const words = val.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    setFormData((prev) => ({
      ...prev,
      content: val,
      read_time: `${minutes} min read`
    }));
  };

  // Insert Text at Cursor in Content
  const insertIntoContent = (textToInsert) => {
    const textarea = contentTextareaRef.current;
    if (!textarea) {
      setFormData((prev) => ({ ...prev, content: prev.content + "\n" + textToInsert }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const newContent = before + textToInsert + after;
    handleContentChange(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 50);
  };

  // AWS S3 Cover Image Upload
  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WebP)");
      return;
    }

    setUploadingCover(true);
    setCoverUploadProgress(10);

    try {
      const res = await UploadFile({
        file,
        onProgress: (percent) => setCoverUploadProgress(Math.round(percent))
      });

      setFormData((prev) => ({
        ...prev,
        cover_image: res.file_url,
        cover_image_alt: prev.cover_image_alt || prev.title || file.name.split(".")[0]
      }));
      toast.success("Cover image uploaded to AWS S3!");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload image to AWS S3");
    } finally {
      setUploadingCover(false);
      setCoverUploadProgress(0);
    }
  };

  // AWS S3 In-Content Media Upload (Image or Video)
  const handleInContentMediaUpload = async (e, type = "image") => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingMedia(true);
    setMediaUploadProgress(10);

    try {
      const res = await UploadFile({
        file,
        onProgress: (percent) => setMediaUploadProgress(Math.round(percent))
      });

      if (type === "video") {
        insertIntoContent(`\n<video controls src="${res.file_url}" class="rounded-xl w-full my-4 border border-zinc-800 shadow-xl"></video>\n`);
        toast.success("Video uploaded to AWS S3 & inserted!");
      } else {
        insertIntoContent(`\n![${file.name.split(".")[0]}](${res.file_url})\n`);
        toast.success("Image uploaded to AWS S3 & inserted!");
      }
    } catch (err) {
      console.error("Media upload error:", err);
      toast.error("Failed to upload media to AWS S3");
    } finally {
      setUploadingMedia(false);
      setMediaUploadProgress(0);
      e.target.value = null; // reset file input
    }
  };

  // Tag Helpers
  const handleAddTag = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, "");
      if (val && !formData.tags.includes(val)) {
        setFormData((prev) => ({ ...prev, tags: [...prev.tags, val] }));
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove)
    }));
  };

  // FAQ Helpers
  const addFAQ = () => {
    setFormData((prev) => ({
      ...prev,
      faqs: [...prev.faqs, { q: "", a: "" }]
    }));
  };

  const updateFAQ = (index, field, value) => {
    const updated = [...formData.faqs];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, faqs: updated }));
  };

  const removeFAQ = (index) => {
    setFormData((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index)
    }));
  };

  // Save / Publish Blog
  // Save / Publish Blog
  const handleSaveBlog = async (statusOverride = null) => {
    if (!formData.title.trim()) {
      toast.error("Please enter a blog title");
      return;
    }
    if (!formData.content.trim()) {
      toast.error("Please write some content for the blog");
      return;
    }

    setSaving(true);
    const finalStatus = statusOverride || formData.status;
    const finalSlug = formData.slug || formData.title.toLowerCase().replace(/\s+/g, "-");

    const { id: currentId, ...cleanFormData } = formData;

    const payload = {
      ...cleanFormData,
      slug: finalSlug,
      status: finalStatus,
      updated_date: new Date().toISOString(),
      views: formData.views || 0
    };

    if (!payload.created_date) {
      payload.created_date = new Date().toISOString();
    }

    try {
      if (currentId) {
        await Blog.update(currentId, payload);
        toast.success(`Blog updated successfully! (${finalStatus})`);
      } else {
        const created = await Blog.create(payload);
        setFormData((prev) => ({ ...prev, id: created.id }));
        toast.success(`Blog created successfully! (${finalStatus})`);
      }
      await loadBlogs();
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving blog:", err);
      toast.error("Error saving blog to database");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlog = async (id, title) => {
    if (!id) {
      toast.error("Invalid Blog ID");
      return false;
    }
    if (confirm(`Are you sure you want to delete "${title || 'this article'}"?`)) {
      try {
        await Blog.delete(id);
        toast.success("Blog deleted successfully");
        await loadBlogs();
        return true;
      } catch (err) {
        console.error("Delete error:", err);
        toast.error(`Failed to delete blog: ${err.message || 'Unknown error'}`);
        return false;
      }
    }
    return false;
  };

  // Start New Blog
  const startNewBlog = () => {
    setFormData({
      id: null,
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      cover_image: "",
      cover_image_alt: "",
      category: "Guides",
      tags: ["Esports", "FreeFire", "Tournament"],
      author_name: "BattleHub Editorial",
      author_role: "Official",
      read_time: "5 min read",
      status: "published",
      focus_keyword: "",
      meta_title: "",
      meta_description: "",
      faqs: [],
      featured: false
    });
    setIsEditing(true);
    setIsPreview(false);
  };

  // Start Edit Blog
  const startEditBlog = (blog) => {
    setFormData({
      ...blog,
      faqs: blog.faqs || [],
      tags: blog.tags || []
    });
    setIsEditing(true);
    setIsPreview(false);
  };

  // SEO Score Calculator
  const calculateSEOScore = () => {
    let score = 0;
    const checks = [];

    // Title length (40-65 chars)
    if (formData.title.length >= 30 && formData.title.length <= 70) {
      score += 20;
      checks.push({ label: "Title length is optimal (30-70 chars)", pass: true });
    } else {
      checks.push({ label: "Title length should be 30-70 chars", pass: false });
    }

    // Focus keyword in title
    if (formData.focus_keyword && formData.title.toLowerCase().includes(formData.focus_keyword.toLowerCase())) {
      score += 20;
      checks.push({ label: "Focus keyword found in Title", pass: true });
    } else if (formData.focus_keyword) {
      checks.push({ label: "Focus keyword missing from Title", pass: false });
    }

    // Cover image present & has alt text
    if (formData.cover_image && formData.cover_image_alt) {
      score += 20;
      checks.push({ label: "Cover image with Alt-text present", pass: true });
    } else {
      checks.push({ label: "Cover image or Alt-text missing", pass: false });
    }

    // Content word count > 300 words
    const words = formData.content.trim().split(/\s+/).filter(Boolean).length;
    if (words >= 300) {
      score += 20;
      checks.push({ label: `Content length good (${words} words)`, pass: true });
    } else {
      checks.push({ label: `Content too short (${words}/300 words)`, pass: false });
    }

    // Meta description present
    if (formData.meta_description && formData.meta_description.length >= 50) {
      score += 20;
      checks.push({ label: "Meta description optimal", pass: true });
    } else {
      checks.push({ label: "Meta description should be 50-160 chars", pass: false });
    }

    return { score, checks };
  };

  const seoData = calculateSEOScore();

  const filteredBlogs = blogs.filter((b) => {
    const matchesSearch =
      b.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || b.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: WRITE / EDIT STUDIO
  // ═══════════════════════════════════════════════════════════════════════════
  if (isEditing) {
    return (
      <div className="space-y-6 pb-20 text-slate-200">
        
        {/* Top Sticky Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl sticky top-2 z-20 shadow-xl">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(false)}
              className="bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-300 gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Blogs
            </Button>
            <div className="h-4 w-[1px] bg-slate-800 hidden sm:block" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {formData.id ? "Edit Blog" : "Write New Blog"}
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {formData.id && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const deleted = await handleDeleteBlog(formData.id, formData.title);
                  if (deleted) setIsEditing(false);
                }}
                disabled={saving}
                className="bg-slate-950 border-slate-800 hover:bg-red-500/10 hover:border-red-500/30 text-red-500 gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPreview(!isPreview)}
              className="bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-300 gap-1.5"
            >
              <Eye className="w-4 h-4 text-orange-500" />
              {isPreview ? "Editor View" : "Live Preview"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSaveBlog("draft")}
              disabled={saving}
              className="bg-slate-950 border-slate-800 hover:bg-slate-800 text-amber-400 gap-1"
            >
              {formData.id ? "Update Draft" : "Save Draft"}
            </Button>

            <Button
              size="sm"
              onClick={() => handleSaveBlog("published")}
              disabled={saving}
              className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold gap-1.5 shadow-lg shadow-orange-600/20"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (formData.id ? <Edit3 className="w-4 h-4" /> : <Globe className="w-4 h-4" />)}
              {formData.id ? "Update Article" : "Publish Article"}
            </Button>
          </div>
        </div>

        {/* PREVIEW MODE */}
        {isPreview ? (
          <div className="max-w-3xl mx-auto bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 uppercase tracking-widest text-[10px]">
              {formData.category}
            </Badge>
            <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
              {formData.title || "Untitled Blog Post"}
            </h1>
            <div className="flex items-center gap-4 text-xs text-slate-400 pb-4 border-b border-slate-800">
              <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-orange-500" /> {formData.author_name}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-orange-500" /> {formData.read_time}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-orange-500" /> Today</span>
            </div>
            {formData.cover_image && (
              <img
                src={formData.cover_image}
                alt={formData.cover_image_alt || formData.title}
                className="w-full aspect-video object-cover rounded-2xl border border-slate-800 shadow-xl"
              />
            )}
            <p className="text-base text-slate-300 font-medium italic border-l-2 border-orange-500 pl-4">
              {formData.excerpt}
            </p>
            <div className="whitespace-pre-wrap leading-relaxed text-slate-200 text-sm sm:text-base space-y-4 font-sans">
              {formData.content}
            </div>
            {formData.faqs.length > 0 && (
              <div className="pt-6 border-t border-slate-800 space-y-3">
                <h3 className="text-lg font-bold text-white">Frequently Asked Questions</h3>
                {formData.faqs.map((f, i) => (
                  <div key={i} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-1">
                    <p className="font-bold text-sm text-orange-400">Q: {f.q}</p>
                    <p className="text-xs text-slate-300">A: {f.a}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* MAIN TWO-COLUMN STUDIO */
          <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-4 gap-8 xl:gap-12">
            
            {/* LEFT COLUMN: The Document (Col-span 3) */}
            <div className="xl:col-span-3 space-y-4">
              
              {/* Inline Cover Image */}
              {formData.cover_image ? (
                <div className="relative group w-full rounded-3xl overflow-hidden bg-slate-900 border border-slate-800/50 aspect-[21/9] sm:aspect-[3/1] mb-8">
                  <img src={formData.cover_image} alt={formData.cover_image_alt || "Cover"} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <label className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-lg">
                      Change Cover Image
                      <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                    </label>
                    <button type="button" onClick={() => setFormData({ ...formData, cover_image: "" })} className="px-5 py-2.5 bg-red-600/90 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-colors shadow-lg">
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="block w-full border border-dashed border-slate-700 hover:border-slate-500 rounded-3xl aspect-[21/9] sm:aspect-[3/1] mb-8 flex flex-col items-center justify-center p-6 cursor-pointer bg-slate-900/20 hover:bg-slate-900/40 transition-all text-slate-500 hover:text-slate-400 group">
                  {uploadingCover ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-bold text-orange-400">Uploading... ({coverUploadProgress}%)</span>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 mb-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                      <span className="text-sm font-bold text-slate-300">Add a Cover Banner</span>
                      <span className="text-[10px] mt-1 opacity-70">Recommended: 1200 x 675 px</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={uploadingCover} />
                </label>
              )}

              {/* Title Input */}
              <input
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Blog Title..."
                className="w-full bg-transparent border-0 text-white font-black text-4xl sm:text-5xl lg:text-6xl focus:ring-0 px-0 placeholder:text-slate-800 leading-tight mb-2 tracking-tight"
              />

              {/* Subtle Toolbar */}
              <div className="border-b border-slate-800/60 pb-3 mb-6 sticky top-16 z-10 bg-slate-950/95 backdrop-blur-md flex flex-wrap items-center gap-1.5 text-slate-400">
                <button type="button" onClick={() => insertIntoContent("\n## Subheading\n")} className="p-2 rounded-lg hover:bg-slate-800 hover:text-white transition-colors" title="H2"><Heading2 className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertIntoContent("\n### Section\n")} className="p-2 rounded-lg hover:bg-slate-800 hover:text-white transition-colors" title="H3"><Heading3 className="w-4 h-4" /></button>
                <div className="w-[1px] h-4 bg-slate-800 mx-1" />
                <button type="button" onClick={() => insertIntoContent("**bold text**")} className="p-2 rounded-lg hover:bg-slate-800 hover:text-white transition-colors" title="Bold"><Bold className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertIntoContent("*italic text*")} className="p-2 rounded-lg hover:bg-slate-800 hover:text-white transition-colors" title="Italic"><Italic className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertIntoContent("\n* item\n* item\n")} className="p-2 rounded-lg hover:bg-slate-800 hover:text-white transition-colors" title="Bulleted List"><List className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertIntoContent("\n> Important Note\n")} className="p-2 rounded-lg hover:bg-slate-800 hover:text-white transition-colors" title="Quote"><Quote className="w-4 h-4" /></button>
                <div className="w-[1px] h-4 bg-slate-800 mx-1" />
                <button type="button" onClick={() => insertIntoContent("\n| Header | Header |\n| :--- | :--- |\n| Row | Row |\n")} className="p-2 rounded-lg hover:bg-slate-800 hover:text-white transition-colors" title="Table"><Table className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertIntoContent('\n<div class="my-6 p-5 bg-gradient-to-r from-orange-600/20 to-amber-600/10 border border-orange-500/30 rounded-2xl text-center"><h3 class="text-lg font-black text-white mb-2">Ready to Host Your Tournament?</h3><a href="/tournaments" class="inline-block bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-lg mt-4">Host Tournament on BattleHub</a></div>\n')} className="p-2 rounded-lg hover:bg-slate-800 hover:text-orange-400 transition-colors" title="CTA Box"><Sparkles className="w-4 h-4" /></button>
                <div className="w-[1px] h-4 bg-slate-800 mx-1" />
                <label className="p-2 rounded-lg hover:bg-slate-800 hover:text-emerald-400 transition-colors cursor-pointer" title="Upload Image">
                  <ImageIcon className="w-4 h-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleInContentMediaUpload(e, "image")} />
                </label>
                <label className="p-2 rounded-lg hover:bg-slate-800 hover:text-purple-400 transition-colors cursor-pointer" title="Upload Video">
                  <Video className="w-4 h-4" />
                  <input type="file" accept="video/*" className="hidden" onChange={(e) => handleInContentMediaUpload(e, "video")} />
                </label>
              </div>

              {/* Media Upload Progress Banner */}
              {uploadingMedia && (
                <div className="bg-orange-950/40 border border-orange-500/30 rounded-xl px-4 py-2 flex items-center justify-between text-xs text-orange-300 mb-4">
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    Uploading Media to AWS S3...
                  </span>
                  <span className="font-mono">{mediaUploadProgress}%</span>
                </div>
              )}

              {/* Content Textarea */}
              <Textarea
                ref={contentTextareaRef}
                value={formData.content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Write your story here... Use Markdown or HTML."
                className="w-full bg-transparent border-0 text-slate-300 text-lg sm:text-xl leading-[1.8] p-0 min-h-[600px] focus:ring-0 resize-y font-sans placeholder:text-slate-700"
              />
              
              <div className="text-[11px] text-slate-600 font-mono mt-8 pt-6 border-t border-slate-800/50">
                Words: {formData.content.trim().split(/\s+/).filter(Boolean).length} | {formData.read_time}
              </div>
            </div>

            {/* RIGHT COLUMN: Settings Sidebar (Col-span 1) */}
            <div className="space-y-6 lg:sticky lg:top-16 lg:h-[calc(100vh-80px)] overflow-y-auto pb-10 scrollbar-hide">
              
              {/* Publishing / SEO Card */}
              <div className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-3xl space-y-5">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-orange-500" /> Post Settings
                </h4>
                
                {/* URL Slug */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">URL Slug</Label>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-slate-500 font-mono">battlehub.site/blog/</span>
                    <Input
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                      className="bg-slate-950/50 border-slate-800 text-xs text-orange-400 h-8 focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Short Excerpt */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Short Excerpt (SEO Description)
                  </Label>
                  <Textarea
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value, meta_description: e.target.value })}
                    placeholder="1-2 sentences summarizing the article..."
                    className="bg-slate-950/50 border-slate-800 text-slate-300 text-xs h-20 resize-none focus:border-orange-500"
                  />
                </div>
                
                {/* Category & Tags */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800/50">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</Label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tags</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {formData.tags.map((t) => (
                      <Badge key={t} className="bg-slate-800/50 text-slate-300 text-[10px] gap-1 py-0.5 border-slate-700">
                        #{t}
                        <button type="button" onClick={() => removeTag(t)} className="text-slate-500 hover:text-white"><X className="w-2.5 h-2.5" /></button>
                      </Badge>
                    ))}
                  </div>
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Type tag & press Enter..."
                    className="bg-slate-950/50 border-slate-800 text-xs text-slate-300 h-8"
                  />
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-800/50">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Author Name</Label>
                  <Input
                    value={formData.author_name}
                    onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                    className="bg-slate-950/50 border-slate-800 text-xs text-white h-8"
                  />
                </div>
              </div>

              {/* FAQ Builder (Accordian Style) */}
              <div className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-orange-500" /> FAQ Schema
                    </h3>
                  </div>
                  <Button type="button" size="sm" onClick={addFAQ} className="h-6 px-2 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 gap-1 rounded-lg">
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {formData.faqs.map((faq, idx) => (
                    <div key={idx} className="bg-slate-950/50 border border-slate-800/80 p-3 rounded-2xl space-y-2 relative group">
                      <button type="button" onClick={() => removeFAQ(idx)} className="absolute top-1 right-1 text-slate-600 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                      <Input
                        value={faq.q}
                        onChange={(e) => updateFAQ(idx, "q", e.target.value)}
                        placeholder={`Q${idx + 1}...`}
                        className="bg-transparent border-0 border-b border-slate-800 rounded-none px-1 h-6 text-xs text-white focus:ring-0"
                      />
                      <Textarea
                        value={faq.a}
                        onChange={(e) => updateFAQ(idx, "a", e.target.value)}
                        placeholder="Answer..."
                        className="bg-transparent border-0 px-1 text-[11px] text-slate-400 h-12 resize-none focus:ring-0"
                      />
                    </div>
                  ))}
                  {formData.faqs.length === 0 && (
                    <p className="text-[10px] text-slate-500 text-center italic py-2">Add FAQs to show in Google Search cards.</p>
                  )}
                </div>
              </div>

              {/* Google SEO Score Mini Card */}
              <div className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-blue-400" /> SEO Score
                  </h4>
                  <div className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                    seoData.score >= 80 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    seoData.score >= 50 ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                    "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}>
                    {seoData.score}/100
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <Input
                    value={formData.focus_keyword}
                    onChange={(e) => setFormData({ ...formData, focus_keyword: e.target.value })}
                    placeholder="Focus Keyword..."
                    className="bg-slate-950/50 border-slate-800 text-xs text-orange-400 h-8"
                  />
                </div>
                
                {/* Checklist (Mini) */}
                <div className="space-y-1 pt-2">
                  {seoData.checks.map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[10px]">
                      {c.pass ? <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> : <AlertCircle className="w-3 h-3 text-slate-600 shrink-0" />}
                      <span className={c.pass ? "text-slate-400" : "text-slate-600 truncate"}>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              
            </div>

          </div>
        )}

      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER: BLOG LIST & DASHBOARD TABLE
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 text-slate-200">
      
      {/* Header with Stats & Write Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-500" /> Blog & Article Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Write, optimize, and publish high-ranking esports guides and tournament updates to AWS S3 & Google.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadBlogs(true)}
            disabled={loading}
            className="bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-300 text-xs h-9 px-3 gap-1.5"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button
            onClick={startNewBlog}
            className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-orange-600/20 h-9"
          >
            <Plus className="w-4 h-4" /> Write New Blog
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles by title or keyword..."
            className="pl-8 bg-slate-900/60 border-slate-800 text-xs text-white h-9"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <Button
            size="sm"
            variant={categoryFilter === "all" ? "default" : "outline"}
            onClick={() => setCategoryFilter("all")}
            className={`text-xs h-8 ${categoryFilter === "all" ? "bg-orange-600 text-white" : "bg-slate-900/60 border-slate-800 text-slate-400"}`}
          >
            All ({blogs.length})
          </Button>
          {CATEGORIES.map((c) => (
            <Button
              key={c}
              size="sm"
              variant={categoryFilter === c ? "default" : "outline"}
              onClick={() => setCategoryFilter(c)}
              className={`text-xs h-8 shrink-0 ${categoryFilter === c ? "bg-orange-600 text-white" : "bg-slate-900/60 border-slate-800 text-slate-400"}`}
            >
              {c}
            </Button>
          ))}
        </div>
      </div>

      {/* Blog Cards / List */}
      {loading ? (
        <div className="text-center py-20">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading blog directory...</p>
        </div>
      ) : filteredBlogs.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No Blog Posts Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Start writing your first esports guide or tournament update with our professional SEO editor!
          </p>
          <Button
            onClick={startNewBlog}
            size="sm"
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs mt-2"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Create First Article
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBlogs.map((blog) => (
            <Card
              key={blog.id}
              className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition-all rounded-2xl overflow-hidden flex flex-col group shadow-md"
            >
              {/* Thumbnail */}
              <div className="aspect-video relative bg-slate-950 overflow-hidden">
                {blog.cover_image ? (
                  <img
                    src={blog.cover_image}
                    alt={blog.cover_image_alt || blog.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                    No Cover Image
                  </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-2.5 left-2.5">
                  <Badge
                    className={`text-[9px] uppercase tracking-wider font-bold ${
                      blog.status === "published"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    }`}
                  >
                    {blog.status}
                  </Badge>
                </div>

                {/* Category Badge */}
                <div className="absolute top-2.5 right-2.5">
                  <Badge className="bg-slate-950/80 text-slate-300 border-slate-800 text-[9px]">
                    {blog.category}
                  </Badge>
                </div>
              </div>

              {/* Card Body */}
              <CardContent className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="font-bold text-white text-sm line-clamp-2 group-hover:text-orange-400 transition-colors">
                    {blog.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                    {blog.excerpt || blog.content?.substring(0, 100)}
                  </p>
                </div>

                {/* Card Footer Info & Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-orange-500" /> {blog.read_time || "4 min read"}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEditBlog(blog)}
                      className="w-7 h-7 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                      title="Edit Article"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteBlog(blog.id, blog.title)}
                      className="w-7 h-7 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                      title="Delete Article"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}
