import React, { useState, useEffect } from 'react';
import { GameMap } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Map, Plus, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadFileToAWS } from '@/utils/awsStorage';
import { db } from '@/api/firebaseClient';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export default function GameMapManagement() {
  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newMapName, setNewMapName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'game_maps'), orderBy('created_date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mapsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMaps(mapsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching maps:", error);
      toast.error("Failed to load maps");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!newMapName.trim()) {
      toast.error('Please enter a map name');
      return;
    }
    if (!selectedFile) {
      toast.error('Please select an image file');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Uploading map...');

    try {
      const file_url = await uploadFileToAWS(selectedFile);
      
      await GameMap.create({
        name: newMapName.trim(),
        url: file_url,
        created_date: new Date().toISOString()
      });

      toast.success('Map uploaded successfully', { id: toastId });
      setNewMapName('');
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById('map-upload-input');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload map', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this map? It will be removed from all strategy boards.")) {
      try {
        await GameMap.delete(id);
        toast.success("Map deleted successfully");
      } catch (err) {
        console.error(err);
        toast.error("Failed to delete map");
      }
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>;
  }

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2">
          <Map className="w-6 h-6 text-purple-500" />
          Game Maps
        </h2>
        <p className="text-gray-400 text-sm">Manage maps available for the Strategy Board</p>
      </div>

      <div className="bg-[#12121a] border border-white/5 p-6 rounded-2xl shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-white mb-4">Add New Map</h3>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Map Name</label>
            <Input 
              value={newMapName}
              onChange={(e) => setNewMapName(e.target.value)}
              placeholder="e.g. Bermuda 2.0"
              className="bg-black/50 border-white/10 text-white"
            />
          </div>
          <div className="flex-1 w-full space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Map Image</label>
            <div className="relative">
              <Input 
                id="map-upload-input"
                type="file" 
                accept="image/*"
                onChange={handleFileSelect}
                className="bg-black/50 border-white/10 text-gray-300 file:bg-purple-600 file:text-white file:border-0 file:mr-4 file:px-4 file:py-2 file:rounded-lg file:font-bold file:text-xs file:uppercase file:-my-2 file:-ml-3"
              />
            </div>
          </div>
          <Button 
            onClick={handleUpload} 
            disabled={uploading || !newMapName || !selectedFile}
            className="w-full md:w-auto bg-purple-600 hover:bg-purple-500 text-white font-bold h-10 px-8"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Upload
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {maps.map(map => (
          <div key={map.id} className="group bg-[#12121a] border border-white/5 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-colors">
            <div className="aspect-square bg-black relative">
              <img src={map.url} alt={map.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
              <button 
                onClick={() => handleDelete(map.id)}
                className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-between">
              <h4 className="font-bold text-white">{map.name}</h4>
              <ImageIcon className="w-4 h-4 text-gray-500" />
            </div>
          </div>
        ))}
        
        {maps.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-white/5 rounded-2xl">
            <Map className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-bold">No maps found</p>
            <p className="text-sm">Upload a map to make it available in the Strategy Board.</p>
          </div>
        )}
      </div>
    </div>
  );
}
