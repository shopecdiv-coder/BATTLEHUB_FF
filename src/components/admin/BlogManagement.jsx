import React, { useState, useEffect, useRef } from "react";
import { Blog } from "@/entities/Blog";
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
  CheckCircle2, ExternalLink
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

  const loadBlogs = async () => {
    setLoading(false);
    try {
      const docs = await Blog.list("-created_date");
      setBlogs(docs || []);
    } catch (err) {
      console.error("Error loading blogs:", err);
      toast.error("Failed to load blogs from database");
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

    const payload = {
      ...formData,
      slug: finalSlug,
      status: finalStatus,
      updated_date: new Date().toISOString(),
      views: formData.views || 0
    };

    if (!payload.created_date) {
      payload.created_date = new Date().toISOString();
    }

    try {
      if (formData.id) {
        await Blog.update(formData.id, payload);
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

  // Delete Blog
  const handleDeleteBlog = async (id, title) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await Blog.delete(id);
        toast.success("Blog deleted successfully");
        loadBlogs();
      } catch (err) {
        console.error("Delete error:", err);
        toast.error("Failed to delete blog");
      }
    }
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
              Save Draft
            </Button>

            <Button
              size="sm"
              onClick={() => handleSaveBlog("published")}
              disabled={saving}
              className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold gap-1.5 shadow-lg shadow-orange-600/20"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Globe className="w-4 h-4" />}
              Publish Article
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT COLUMN: Content Editor (Col-span 2) */}
            <div className="lg:col-span-2 space-y-5">
              
              {/* Title Input */}
              <div className="bg-slate-900/60 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-3 shadow-sm">
                <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Blog Title (H1 Header) <span className="text-red-400">*</span>
                </Label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g., How to Host Free Fire MAX Tournaments in 2026 (Complete Guide)"
                  className="bg-slate-950 border-slate-800 text-white font-bold text-base sm:text-lg focus:border-orange-500"
                />
                
                {/* Auto URL Slug */}
                <div className="flex items-center gap-1 text-xs text-slate-400 font-mono overflow-hidden">
                  <span className="text-slate-500 shrink-0">https://battlehub.site/blog/</span>
                  <input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                    className="bg-transparent border-b border-dashed border-slate-700 text-orange-400 focus:outline-none focus:border-orange-500 w-full"
                    placeholder="url-slug"
                  />
                </div>
              </div>

              {/* Short Excerpt */}
              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl space-y-2">
                <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Short Excerpt / Summary (Card Preview)
                </Label>
                <Textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value, meta_description: e.target.value })}
                  placeholder="Brief summary of the article that appears in Google search and blog cards (1-2 sentences)..."
                  className="bg-slate-950 border-slate-800 text-slate-200 text-xs sm:text-sm h-18 resize-none focus:border-orange-500"
                />
              </div>

              {/* Rich Content Editor with Floating Toolbar */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                
                {/* Toolbar */}
                <div className="bg-slate-950/80 border-b border-slate-800 p-2 flex flex-wrap items-center gap-1 text-xs sticky top-18 z-10">
                  <button
                    type="button"
                    onClick={() => insertIntoContent("\n## Subheading Here\n")}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-300 flex items-center gap-1 font-bold text-xs"
                    title="Insert H2 Heading"
                  >
                    <Heading2 className="w-3.5 h-3.5 text-orange-400" /> H2
                  </button>
                  <button
                    type="button"
                    onClick={() => insertIntoContent("\n### Sub-section Here\n")}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-300 flex items-center gap-1 font-bold text-xs"
                    title="Insert H3 Heading"
                  >
                    <Heading3 className="w-3.5 h-3.5 text-orange-400" /> H3
                  </button>
                  <div className="w-[1px] h-4 bg-slate-800 mx-1" />
                  
                  <button
                    type="button"
                    onClick={() => insertIntoContent("**bold text**")}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-300 font-bold"
                    title="Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertIntoContent("*italic text*")}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-300 italic"
                    title="Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertIntoContent("\n* Bullet item 1\n* Bullet item 2\n")}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                    title="Bullet List"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertIntoContent("\n1. Step 1\n2. Step 2\n")}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                    title="Numbered List"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertIntoContent("\n> Important Note or Pro Player Tip goes here.\n")}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-300"
                    title="Quote / Tip Box"
                  >
                    <Quote className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-[1px] h-4 bg-slate-800 mx-1" />

                  {/* Table Insert */}
                  <button
                    type="button"
                    onClick={() => insertIntoContent("\n| Rank | Placement Points | Kill Points |\n| :--- | :--- | :--- |\n| #1 | 12 Pts | 1 Pt per Kill |\n| #2 | 9 Pts | 1 Pt per Kill |\n| #3 | 8 Pts | 1 Pt per Kill |\n")}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-300 flex items-center gap-1 font-semibold"
                    title="Insert Point Table"
                  >
                    <Table className="w-3.5 h-3.5 text-cyan-400" /> Table
                  </button>

                  {/* CTA Widget */}
                  <button
                    type="button"
                    onClick={() => insertIntoContent('\n<div class="my-6 p-5 bg-gradient-to-r from-orange-600/20 to-amber-600/10 border border-orange-500/30 rounded-2xl text-center"><h3 class="text-lg font-black text-white mb-2">Ready to Host Your Tournament?</h3><p class="text-xs text-slate-300 mb-4">Join India\'s fastest growing esports platform with automated brackets and 0-leak room dispatch.</p><a href="/tournaments" class="inline-block bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-lg">Host Tournament on BattleHub</a></div>\n')}
                    className="p-1.5 rounded hover:bg-slate-800 text-orange-400 font-bold flex items-center gap-1"
                    title="Insert Call-To-Action Box"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-orange-500" /> CTA Box
                  </button>

                  <div className="w-[1px] h-4 bg-slate-800 mx-1" />

                  {/* AWS S3 Image Uploader in Toolbar */}
                  <label className="p-1.5 rounded hover:bg-slate-800 text-emerald-400 flex items-center gap-1 font-semibold cursor-pointer">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Upload Image (AWS)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleInContentMediaUpload(e, "image")}
                    />
                  </label>

                  {/* AWS S3 Video Uploader in Toolbar */}
                  <label className="p-1.5 rounded hover:bg-slate-800 text-purple-400 flex items-center gap-1 font-semibold cursor-pointer">
                    <Video className="w-3.5 h-3.5" />
                    <span>Upload Video (AWS)</span>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => handleInContentMediaUpload(e, "video")}
                    />
                  </label>
                </div>

                {/* Media Upload Progress Banner */}
                {uploadingMedia && (
                  <div className="bg-orange-950/40 border-b border-orange-500/30 px-4 py-2 flex items-center justify-between text-xs text-orange-300">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      Uploading Media to AWS S3... ({mediaUploadProgress}%)
                    </span>
                    <span className="font-mono">{mediaUploadProgress}%</span>
                  </div>
                )}

                {/* Main Textarea */}
                <Textarea
                  ref={contentTextareaRef}
                  value={formData.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Write your article content here in Markdown or HTML... Use headings (##), images (![alt](url)), tables, and tips to make it rank #1 on Google!"
                  className="bg-transparent border-0 text-slate-100 text-sm sm:text-base leading-relaxed p-4 sm:p-5 min-h-[420px] focus:ring-0 resize-y font-mono"
                />

                {/* Editor Footer Status */}
                <div className="bg-slate-950/80 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Words: <strong className="text-slate-300">{formData.content.trim().split(/\s+/).filter(Boolean).length}</strong>
                  </span>
                  <span>{formData.read_time}</span>
                </div>
              </div>

              {/* FAQ Schema Builder Section (Google Rich Snippets) */}
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-orange-500" /> FAQ Section (Google Rich Snippet Schema)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Add questions and answers here to make Google show expandable accordion cards on Search!
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={addFAQ}
                    className="bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add FAQ
                  </Button>
                </div>

                {formData.faqs.map((faq, idx) => (
                  <div key={idx} className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl space-y-2 relative">
                    <button
                      type="button"
                      onClick={() => removeFAQ(idx)}
                      className="absolute top-2 right-2 text-slate-500 hover:text-red-400 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <Input
                      value={faq.q}
                      onChange={(e) => updateFAQ(idx, "q", e.target.value)}
                      placeholder={`Question #${idx + 1} (e.g., How do I withdraw tournament prize money?)`}
                      className="bg-slate-900 border-slate-800 text-xs text-white"
                    />
                    <Textarea
                      value={faq.a}
                      onChange={(e) => updateFAQ(idx, "a", e.target.value)}
                      placeholder="Answer in 1-3 sentences..."
                      className="bg-slate-900 border-slate-800 text-xs text-slate-300 h-16 resize-none"
                    />
                  </div>
                ))}
              </div>

            </div>

            {/* RIGHT COLUMN: Inspector & SEO Settings (Col-span 1) */}
            <div className="space-y-5">
              
              {/* Featured Image (Cover Banner) Upload Card */}
              <div className="bg-slate-900/60 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-3">
                <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Cover Banner (16:9)</span>
                  <span className="text-[10px] text-orange-400 font-semibold">AWS S3 Stored</span>
                </Label>

                {formData.cover_image ? (
                  <div className="relative group rounded-xl overflow-hidden border border-slate-800 aspect-video">
                    <img
                      src={formData.cover_image}
                      alt={formData.cover_image_alt || "Cover"}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs cursor-pointer">
                        Change Image
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleCoverUpload}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, cover_image: "" })}
                        className="p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-800 hover:border-orange-500/50 rounded-xl aspect-video flex flex-col items-center justify-center p-4 cursor-pointer bg-slate-950/40 hover:bg-slate-950/80 transition-all text-center">
                    {uploadingCover ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-orange-400 font-bold">Uploading to AWS ({coverUploadProgress}%)</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-slate-500 mb-2" />
                        <span className="text-xs font-bold text-slate-300">Click to Upload Cover Image</span>
                        <span className="text-[10px] text-slate-500 mt-1">Recommended: 1200 x 675 px (PNG, JPG, WebP)</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverUpload}
                      disabled={uploadingCover}
                    />
                  </label>
                )}

                {/* Alt-Text input for image SEO */}
                <div className="space-y-1 pt-1">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Image Alt Text (Google Image SEO)
                  </Label>
                  <Input
                    value={formData.cover_image_alt}
                    onChange={(e) => setFormData({ ...formData, cover_image_alt: e.target.value })}
                    placeholder="Describe image with keywords..."
                    className="bg-slate-950 border-slate-800 text-xs h-8 text-slate-300"
                  />
                </div>
              </div>

              {/* Category & Tags Card */}
              <div className="bg-slate-900/60 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Category</Label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Tags</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {formData.tags.map((t) => (
                      <Badge key={t} className="bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs gap-1 py-1">
                        #{t}
                        <button type="button" onClick={() => removeTag(t)} className="text-slate-500 hover:text-white">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Type tag & press Enter (e.g. FreeFire, Scrims)..."
                    className="bg-slate-950 border-slate-800 text-xs text-slate-300 h-8"
                  />
                </div>

                {/* Author Info */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">Author Name</Label>
                  <Input
                    value={formData.author_name}
                    onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                    className="bg-slate-950 border-slate-800 text-xs text-white h-8"
                  />
                </div>
              </div>

              {/* SEO Score & Google Preview Card */}
              <div className="bg-slate-900/60 border border-slate-800 p-4 sm:p-5 rounded-2xl space-y-4">
                
                {/* Score Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">SEO Audit Score</h4>
                    <p className="text-[10px] text-slate-400">Real-time Google Algorithm Check</p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-full text-xs font-black border ${
                    seoData.score >= 80 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" :
                    seoData.score >= 50 ? "bg-amber-500/20 text-amber-400 border-amber-500/40" :
                    "bg-red-500/20 text-red-400 border-red-500/40"
                  }`}>
                    {seoData.score} / 100
                  </div>
                </div>

                {/* Focus Keyword */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Target / Focus Keyword
                  </Label>
                  <Input
                    value={formData.focus_keyword}
                    onChange={(e) => setFormData({ ...formData, focus_keyword: e.target.value })}
                    placeholder="e.g., Free Fire tournament"
                    className="bg-slate-950 border-slate-800 text-xs text-orange-400 h-8"
                  />
                </div>

                {/* Google Snippet Live Simulation */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-left">
                  <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold block mb-1">
                    Google Search Preview
                  </span>
                  <p className="text-xs text-blue-400 font-semibold hover:underline truncate">
                    {formData.meta_title || formData.title || "Blog Title - BattleHub"}
                  </p>
                  <p className="text-[10px] text-emerald-500 truncate font-mono">
                    https://battlehub.site/blog/{formData.slug || "post-url"}
                  </p>
                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                    {formData.meta_description || formData.excerpt || "Article preview description will appear here on Google search..."}
                  </p>
                </div>

                {/* Checklist */}
                <div className="space-y-1.5 text-xs">
                  {seoData.checks.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                      {c.pass ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      )}
                      <span className={c.pass ? "text-slate-300" : "text-slate-500"}>{c.label}</span>
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

        <Button
          onClick={startNewBlog}
          className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs gap-1.5 shadow-lg shadow-orange-600/20"
        >
          <Plus className="w-4 h-4" /> Write New Blog
        </Button>
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
