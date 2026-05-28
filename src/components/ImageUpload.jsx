import { useState, useRef } from 'react';
import { Camera, X, Upload, Loader2, ImagePlus, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ImageUpload({ images = [], onImagesChange, maxImages = 10, folder = 'geral' }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const uploadFile = async (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`Formato não suportado: ${file.type.split('/')[1]}. Use JPG, PNG ou WebP.`);
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 5MB.`);
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('imagens')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('imagens')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleFiles = async (files) => {
    const fileList = Array.from(files);
    const remaining = maxImages - images.length;

    if (remaining <= 0) {
      setError(`Máximo de ${maxImages} imagens atingido.`);
      return;
    }

    const filesToUpload = fileList.slice(0, remaining);
    if (fileList.length > remaining) {
      setError(`Apenas ${remaining} imagem(ns) adicionada(s). Limite: ${maxImages}.`);
    } else {
      setError(null);
    }

    setUploading(true);
    try {
      const uploadPromises = filesToUpload.map(uploadFile);
      const newUrls = await Promise.all(uploadPromises);
      onImagesChange([...images, ...newUrls]);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Erro ao fazer upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveImage = async (index) => {
    const urlToRemove = images[index];
    // Try to delete from storage (extract path from URL)
    try {
      const url = new URL(urlToRemove);
      const pathMatch = url.pathname.match(/\/object\/public\/imagens\/(.+)/);
      if (pathMatch) {
        await supabase.storage.from('imagens').remove([pathMatch[1]]);
      }
    } catch (err) {
      console.warn('Could not delete from storage:', err);
    }
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
        <Camera size={14} className="text-purple-500" />
        Imagens ({images.length}/{maxImages})
      </label>

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {images.map((url, index) => (
            <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm">
              <img
                src={url}
                alt={`Imagem ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all" />
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute top-1 right-1 h-6 w-6 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md"
              >
                <X size={12} />
              </button>
              <span className="absolute bottom-1 left-1 text-[9px] font-bold bg-black/50 text-white px-1.5 py-0.5 rounded-md">
                {index + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {images.length < maxImages && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50'
          } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 size={28} className="text-blue-500 animate-spin" />
              <p className="text-sm font-semibold text-blue-600">Enviando imagem(ns)...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <ImagePlus size={22} className="text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600">
                  Clique ou arraste imagens aqui
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  JPG, PNG ou WebP • Máx. 5MB cada • Até {maxImages - images.length} restante(s)
                </p>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-xs font-semibold bg-red-50 p-2.5 rounded-lg border border-red-100 animate-fade-in">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
    </div>
  );
}
