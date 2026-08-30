import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Image as ImageIcon, Video, FileText, Loader2, Link, X, Play } from "lucide-react";
import { db } from "@/api/firebaseClient";
import { collection, query, where, orderBy, getDocs, limit } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";

export default function GroupMediaDrawer({ group, isOpen, onClose }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("media");
  const [mediaItems, setMediaItems] = useState([]);
  const [links, setLinks] = useState([]);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mediaViewer, setMediaViewer] = useState(null);


  useEffect(() => {
    if (isOpen && group) {
      loadMedia();
    }
  }, [isOpen, group]);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "group_chat_messages"),
        where("group_id", "==", group.id)
      );
      const snap = await getDocs(q);
      
      const loadedMedia = [];
      const loadedLinks = [];
      const loadedDocs = [];
      
      const urlRegex = /((?:https?:\/\/|www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;

      let allDocs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      allDocs.sort((a, b) => new Date(b.created_at || b.created_date) - new Date(a.created_at || a.created_date));

      allDocs.forEach(data => {
        const docId = data.id;
        
        // Skip messages cleared by this user
        if (data.cleared_by && data.cleared_by.includes(user.id)) return;
        
        const msgType = data.message_type || 'text';

        // 1. Legacy attachments (if any)
        if (data.attachments && Array.isArray(data.attachments)) {
          data.attachments.forEach(att => {
            if (att.type?.startsWith('image') || att.type?.startsWith('video')) {
              loadedMedia.push({ ...att, msgId: docId, time: data.created_at });
            } else if (att.type?.startsWith('application/') || att.type?.startsWith('text/')) {
              loadedDocs.push({ ...att, msgId: docId, time: data.created_at });
            }
          });
        }
        
        // 2. Current standard format (message_type)
        if (['image', 'video'].includes(msgType)) {
          const parts = typeof data.message === 'string' ? data.message.split('::') : [];
          if (parts[0]) {
            loadedMedia.push({ type: msgType, url: parts[0], name: parts[1] || 'Media', size: parts[2] ? parseInt(parts[2], 10) : 0, msgId: docId, time: data.created_at });
          }
        } else if (['document', 'file', 'audio', 'pdf'].includes(msgType)) {
          const parts = typeof data.message === 'string' ? data.message.split('::') : [];
          if (parts[0]) {
            loadedDocs.push({ type: msgType, url: parts[0], name: parts[1] || 'Document', size: parts[2] ? parseInt(parts[2], 10) : 0, msgId: docId, time: data.created_at });
          }
        }
        
        // 3. Links in text messages
        if (msgType === 'text' && typeof data.message === 'string') {
          const foundLinks = data.message.match(urlRegex);
          if (foundLinks) {
            // Deduplicate links in the same message and format them
            const uniqueLinks = [...new Set(foundLinks)];
            uniqueLinks.forEach(link => {
              let formattedLink = link;
              if (!formattedLink.startsWith('http://') && !formattedLink.startsWith('https://')) {
                formattedLink = 'https://' + formattedLink;
              }
              loadedLinks.push({ url: formattedLink, displayUrl: link, msgId: docId, time: data.created_at });
            });
          }
        }
      });
      
      setMediaItems(loadedMedia);
      setLinks(loadedLinks);
      setDocs(loadedDocs);
    } catch (e) {
      console.error("Failed to load media", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(val) => !val && onClose()} modal={false}>
        <SheetContent 
        side="right" 
        className="w-full sm:max-w-md bg-slate-950 border-slate-800 p-0 overflow-hidden flex flex-col z-[530]"
      >
        <SheetHeader className="p-4 border-b border-slate-800 bg-slate-950 z-10 flex flex-row items-center gap-4 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white rounded-full bg-slate-900/50 hover:bg-slate-800 mt-2">
            <ArrowRight className="w-5 h-5 rotate-180" />
          </Button>
          <SheetTitle className="text-white text-xl flex-1 text-center pr-10">Media, Links, Docs</SheetTitle>
        </SheetHeader>

        <div className="flex bg-slate-900 border-b border-slate-800">
          <button 
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'media' ? 'border-[#00FFFF] text-[#00FFFF]' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            onClick={() => setActiveTab('media')}
          >
            Media
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'links' ? 'border-[#00FFFF] text-[#00FFFF]' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            onClick={() => setActiveTab('links')}
          >
            Links
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'docs' ? 'border-[#00FFFF] text-[#00FFFF]' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            onClick={() => setActiveTab('docs')}
          >
            Docs
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#00FFFF] animate-spin" />
            </div>
          ) : (
            <>
              {activeTab === 'media' && (
                <div className="grid grid-cols-3 gap-2">
                  {mediaItems.length === 0 ? (
                    <div className="col-span-3 text-center text-gray-500 py-10 text-sm">
                      <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      No media shared in this group yet.
                    </div>
                  ) : (
                    mediaItems.map((item, idx) => (
                      <div key={idx} onClick={(e) => { e.stopPropagation(); setMediaViewer(item); }} className="aspect-square bg-slate-800 rounded-lg overflow-hidden group relative cursor-pointer">
                        {item.type?.startsWith('video') ? (
                          <div className="w-full h-full flex items-center justify-center bg-slate-900">
                            <Video className="w-8 h-8 text-white opacity-50" />
                          </div>
                        ) : (
                          <img src={item.url} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
              
              {activeTab === 'links' && (
                <div className="space-y-4">
                  {links.length === 0 ? (
                    <div className="text-center text-gray-500 py-10 text-sm">
                      <Link className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      No links shared in this group yet.
                    </div>
                  ) : (
                    links.map((link, idx) => (
                      <div key={idx} className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                          <Link className="w-5 h-5 text-[#00FFFF]" />
                        </div>
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline truncate break-all block w-full max-w-[250px]">
                          {link.displayUrl || link.url}
                        </a>
                      </div>
                    ))
                  )}
                </div>
              )}
              
              {activeTab === 'docs' && (
                <div className="space-y-4">
                  {docs.length === 0 ? (
                    <div className="text-center text-gray-500 py-10 text-sm">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      No documents shared in this group yet.
                    </div>
                  ) : (
                    docs.map((doc, idx) => (
                      <div 
                        key={idx} 
                        onClick={(e) => { e.stopPropagation(); setMediaViewer(doc); }}
                        className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3 group cursor-pointer hover:bg-slate-800/80 transition-colors"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-[#00FFFF]" />
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-bold text-white truncate">{doc.name || "Document"}</p>
                            <p className="text-xs text-slate-500">{(doc.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <a 
                          href={doc.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          onClick={e => e.stopPropagation()}
                          className="p-2 rounded-full bg-slate-800 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Open in new tab"
                        >
                          <Link className="w-4 h-4" />
                        </a>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>

      {createPortal(
        <AnimatePresence>
          {mediaViewer && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
              onClick={() => setMediaViewer(null)}
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-5xl h-[90vh] bg-slate-900 rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-slate-800 pointer-events-auto"
              >
                <div className="p-3 border-b border-white/10 flex justify-between items-center bg-slate-950">
                  <h3 className="text-white font-bold text-sm tracking-wider">
                    {mediaViewer.type?.startsWith('image') || mediaViewer.url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? "Image Viewer" :
                     mediaViewer.type?.startsWith('video') || mediaViewer.url.match(/\.(mp4|webm|ogg)$/i) ? "Video Viewer" : "Document Viewer"}
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={() => setMediaViewer(null)} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                      <X className="w-5 h-5"/>
                    </button>
                  </div>
                </div>
                
                <div className="w-full flex-1 bg-black/90 flex items-center justify-center overflow-hidden">
                  {(mediaViewer.type?.startsWith('image') || mediaViewer.url.match(/\.(jpeg|jpg|gif|png|webp)$/i)) ? (
                    <img src={mediaViewer.url} className="w-full h-full object-contain" alt="Media Viewer" />
                  ) : (mediaViewer.type?.startsWith('video') || mediaViewer.url.match(/\.(mp4|webm|ogg)$/i)) ? (
                    <video src={mediaViewer.url} controls autoPlay className="w-full h-full object-contain" />
                  ) : (
                    <iframe 
                      src={mediaViewer.url.toLowerCase().split('?')[0].endsWith('.pdf') ? mediaViewer.url : `https://docs.google.com/viewer?url=${encodeURIComponent(mediaViewer.url)}&embedded=true`} 
                      className="w-full h-full bg-white" 
                      title="Document Viewer"
                    />
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
