import React, { useState, useRef } from 'react';
import { CommunityPost } from '@/entities/CommunityPost';
import { X, Image as ImageIcon, BarChart2, CheckSquare, Plus, Loader2, UploadCloud, Trash2 } from 'lucide-react';
import { containsProfanity } from '@/utils/profanityFilter';
import { base44 } from "@/api/base44Client";

const POST_TYPES = [
  { id: 'image', label: 'Image', icon: ImageIcon },
  { id: 'image_poll', label: 'Image poll', icon: BarChart2 },
  { id: 'text_poll', label: 'Text poll', icon: BarChart2 },
  { id: 'quiz', label: 'Quiz', icon: CheckSquare },
];

export default function CreatePostModal({ isOpen, onClose, user, onPostCreated }) {
  const [text, setText] = useState('');
  const [postType, setPostType] = useState('text'); // default text, changes when clicking options
  
  // States for different types
  const [imageUrl, setImageUrl] = useState('');
  const [options, setOptions] = useState([{ text: '', image_url: '' }, { text: '', image_url: '' }]);
  const [correctAnswer, setCorrectAnswer] = useState(0); // for quiz

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const resetState = () => {
    setText('');
    setPostType('text');
    setImageUrl('');
    setOptions([{ text: '', image_url: '' }, { text: '', image_url: '' }]);
    setCorrectAnswer(0);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileUpload = async (file) => {
    if (!file) return null;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return file_url;
    } catch (error) {
      alert("Error uploading file.");
      return null;
    }
  };

  const handleMainImageUpload = async (e) => {
    setUploadingImage(true);
    const url = await handleFileUpload(e.target.files[0]);
    if (url) {
      setImageUrl(url);
      setPostType('image');
    }
    setUploadingImage(false);
  };

  const handleOptionImageUpload = async (index, file) => {
    setUploadingImage(true);
    const url = await handleFileUpload(file);
    if (url) {
      const newOptions = [...options];
      newOptions[index].image_url = url;
      setOptions(newOptions);
    }
    setUploadingImage(false);
  };

  const addOption = () => {
    if (options.length < 4) {
      setOptions([...options, { text: '', image_url: '' }]);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
      if (correctAnswer >= newOptions.length) {
        setCorrectAnswer(newOptions.length - 1);
      }
    }
  };

  const updateOptionText = (index, value) => {
    const newOptions = [...options];
    newOptions[index].text = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert("Please login to post");
    
    if (containsProfanity(text)) {
      alert("Inappropriate language detected in your post. Please modify your text.");
      return;
    }

    let hasProfaneOptions = false;
    options.forEach(opt => {
      if (containsProfanity(opt.text)) hasProfaneOptions = true;
    });

    if (hasProfaneOptions) {
      alert("Inappropriate language detected in your options. Please modify them.");
      return;
    }

    if (!text.trim() && postType === 'text') return;

    // Validations
    if (postType.includes('poll') || postType === 'quiz') {
      const emptyOption = options.some(o => !o.text.trim() && !o.image_url);
      if (emptyOption) return alert("Please fill all poll options.");
    }

    setLoading(true);
    try {
      const postData = {
        author_id: user.id,
        author_name: user.ign || user.full_name || 'Player',
        author_avatar: user.avatar_url || '',
        text: text.trim(),
        type: postType,
        likes: [],
        comments: [],
        created_date: new Date().toISOString()
      };

      if (postType === 'image') {
        postData.image_url = imageUrl;
      } else if (postType === 'text_poll' || postType === 'image_poll' || postType === 'quiz') {
        postData.options = options.map(o => ({ text: o.text.trim(), image_url: o.image_url }));
        postData.votes = {}; // map of userId -> optionIndex
        if (postType === 'quiz') {
          postData.correct_answer_index = correctAnswer;
        }
      }

      await CommunityPost.create(postData);
      onPostCreated();
      handleClose();
    } catch (err) {
      console.error(err);
      alert("Failed to create post");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />
      
      <div className="relative bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-white">Create Post</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
          {/* User Info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800">
              <img 
                src={user?.avatar_url || `https://api.dicebear.com/6.x/bottts/svg?seed=${user?.id}`} 
                alt="Me" 
                className="w-full h-full object-cover" 
              />
            </div>
            <span className="font-bold text-gray-200">{user?.ign || user?.full_name || 'Player'}</span>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={postType === 'quiz' ? "Ask a question..." : "What's on your mind?"}
            className="w-full bg-transparent text-white placeholder:text-gray-600 resize-none outline-none text-lg min-h-[100px]"
            autoFocus
          />

          {/* Type Specific Inputs */}
          {postType === 'image' && imageUrl && (
            <div className="relative w-full h-48 bg-black rounded-lg overflow-hidden mb-4 border border-gray-800">
              <img src={imageUrl} alt="Preview" className="w-full h-full object-contain" />
              <button 
                type="button"
                onClick={() => { setImageUrl(''); setPostType('text'); }}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {(postType === 'text_poll' || postType === 'quiz') && (
            <div className="space-y-3 mb-4">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {postType === 'quiz' && (
                    <input 
                      type="radio" 
                      name="correct_answer" 
                      checked={correctAnswer === idx}
                      onChange={() => setCorrectAnswer(idx)}
                      className="w-5 h-5 accent-green-500"
                    />
                  )}
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => updateOptionText(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  {options.length > 2 && (
                    <button type="button" onClick={() => removeOption(idx)} className="text-gray-500 hover:text-red-500 p-2">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              {options.length < 4 && (
                <button type="button" onClick={addOption} className="text-orange-500 text-sm font-medium hover:underline p-2">
                  + Add Option
                </button>
              )}
            </div>
          )}

          {postType === 'image_poll' && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {options.map((opt, idx) => (
                <div key={idx} className="relative bg-gray-800 border border-gray-700 rounded-lg p-2 flex flex-col gap-2">
                  <div className="h-24 bg-black rounded flex items-center justify-center overflow-hidden relative">
                    {opt.image_url ? (
                      <img src={opt.image_url} className="w-full h-full object-cover" alt={`Opt ${idx}`} />
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center text-gray-500 hover:text-white w-full h-full">
                        <UploadCloud className="w-6 h-6 mb-1" />
                        <span className="text-xs">Upload</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleOptionImageUpload(idx, e.target.files[0])} />
                      </label>
                    )}
                    {options.length > 2 && (
                      <button type="button" onClick={() => removeOption(idx)} className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded hover:bg-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => updateOptionText(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="w-full bg-transparent border-b border-gray-700 px-1 py-1 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              ))}
              {options.length < 4 && (
                <div className="border border-dashed border-gray-700 rounded-lg flex items-center justify-center h-[140px] hover:bg-gray-800/50 cursor-pointer transition-colors" onClick={addOption}>
                  <Plus className="w-8 h-8 text-gray-600" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-gray-800 shrink-0">
          {/* Post Type Selectors */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleMainImageUpload} />
            
            {POST_TYPES.map((type) => {
              const Icon = type.icon;
              const isActive = postType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => {
                    if (type.id === 'image') {
                      fileInputRef.current.click();
                    } else {
                      setPostType(type.id);
                      if (options.length < 2) setOptions([{ text: '', image_url: '' }, { text: '', image_url: '' }]);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    isActive 
                      ? 'bg-orange-500/20 text-orange-500 border-orange-500/30' 
                      : 'bg-gray-800/50 text-gray-400 border-gray-700 hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {type.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={handleSubmit}
              disabled={loading || uploadingImage || (!text.trim() && postType === 'text')}
              className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-full font-bold shadow-lg shadow-orange-900/20 transition-all flex items-center justify-center min-w-[100px]"
            >
              {loading || uploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : "Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
