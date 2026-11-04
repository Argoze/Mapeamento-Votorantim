import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import { Image as ImageIcon, Upload, X, Loader2, AlertCircle, ZoomIn, Check, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Gera o recorte final (na proporção/posição/zoom escolhidos) como um Blob
// JPEG, já no tamanho que vai ser exibido no site — assim o site público só
// precisa mostrar a imagem (object-cover), sem recalcular recorte nenhum em
// tempo de carregamento.
async function gerarRecorte(imagemUrl, areaRecortePixels, larguraMaxima) {
    const imagem = new Image();
    imagem.crossOrigin = 'anonymous';
    imagem.src = imagemUrl;
    await new Promise((resolve, reject) => {
        imagem.onload = resolve;
        imagem.onerror = reject;
    });

    const escala = Math.min(1, larguraMaxima / areaRecortePixels.width);
    const largura = Math.max(1, Math.round(areaRecortePixels.width * escala));
    const altura = Math.max(1, Math.round(areaRecortePixels.height * escala));

    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
        imagem,
        areaRecortePixels.x,
        areaRecortePixels.y,
        areaRecortePixels.width,
        areaRecortePixels.height,
        0,
        0,
        largura,
        altura
    );

    return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
}

/**
 * Upload de imagem com recorte/zoom/posicionamento (arrastar pra mover,
 * controle de zoom pra aproximar/afastar), numa proporção fixa definida por
 * `aspect`. Usado tanto pela foto de fundo da hero section quanto pelo card
 * de destaque editável — qualquer imagem enviada pelo admin já sai do
 * recorte no tamanho certo pra aquele espaço, sem distorcer nem cortar
 * partes importantes sem o admin ver antes.
 *
 * Props:
 *  - value: URL atual da imagem (ou null)
 *  - onChange(url | null): chamado com a nova URL pública após o upload, ou
 *    null quando a imagem é removida
 *  - aspect: proporção largura/altura do recorte final (ex: 21/9, 4/3)
 *  - folder: subpasta dentro do bucket "imagens" (ex: "home-hero")
 *  - label / hint: textos do campo
 *  - maxOutputWidth: largura máxima (px) do arquivo final enviado
 */
export default function ImageCropUploader({
    value,
    onChange,
    aspect,
    folder,
    label,
    hint,
    maxOutputWidth = 1600,
}) {
    const [arquivoOriginal, setArquivoOriginal] = useState(null); // { url, file }
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [areaRecortePixels, setAreaRecortePixels] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState(null);
    const fileInputRef = useRef(null);

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB na origem (antes de recortar/comprimir)

    const onCropComplete = useCallback((_areaPercentual, areaPixels) => {
        setAreaRecortePixels(areaPixels);
    }, []);

    const handleSelecionarArquivo = (files) => {
        const file = files?.[0];
        if (!file) return;
        setErro(null);

        if (!ALLOWED_TYPES.includes(file.type)) {
            setErro(`Formato não suportado: ${file.type.split('/')[1] || file.type}. Use JPG, PNG ou WebP.`);
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            setErro(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: 15MB.`);
            return;
        }

        const url = URL.createObjectURL(file);
        setArquivoOriginal({ url, file });
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setAreaRecortePixels(null);
    };

    const cancelarRecorte = () => {
        if (arquivoOriginal) URL.revokeObjectURL(arquivoOriginal.url);
        setArquivoOriginal(null);
    };

    const confirmarRecorte = async () => {
        if (!arquivoOriginal || !areaRecortePixels) return;
        setEnviando(true);
        setErro(null);
        try {
            const blob = await gerarRecorte(arquivoOriginal.url, areaRecortePixels, maxOutputWidth);
            if (!blob) throw new Error('Não foi possível gerar o recorte da imagem.');

            const nomeArquivo = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;
            const { error: uploadError } = await supabase.storage
                .from('imagens')
                .upload(nomeArquivo, blob, { cacheControl: '3600', upsert: false, contentType: 'image/jpeg' });
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('imagens').getPublicUrl(nomeArquivo);

            URL.revokeObjectURL(arquivoOriginal.url);
            setArquivoOriginal(null);
            onChange(publicUrl);
        } catch (err) {
            console.error('Erro ao enviar imagem recortada:', err);
            setErro(err.message || 'Erro ao enviar a imagem.');
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="space-y-2">
            {label && (
                <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <ImageIcon size={14} className="text-purple-500" />
                    {label}
                </label>
            )}
            {hint && <p className="text-xs text-slate-400">{hint}</p>}

            {value ? (
                <div
                    className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100"
                    style={{ aspectRatio: aspect }}
                >
                    <img src={value} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-all flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-1.5 bg-white text-slate-700 text-xs font-bold px-3 py-2 rounded-lg shadow-md hover:bg-slate-50"
                        >
                            <Upload size={13} /> Trocar imagem
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange(null)}
                            className="flex items-center gap-1.5 bg-white text-red-600 text-xs font-bold px-3 py-2 rounded-lg shadow-md hover:bg-red-50"
                        >
                            <Trash2 size={13} /> Remover
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center gap-2"
                >
                    <div className="h-12 w-12 bg-slate-100 rounded-xl flex items-center justify-center">
                        <ImageIcon size={22} className="text-slate-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-600">Clique para escolher uma imagem</p>
                    <p className="text-xs text-slate-400">JPG, PNG ou WebP • você ajusta o recorte a seguir</p>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleSelecionarArquivo(e.target.files)}
                className="hidden"
            />

            {erro && (
                <div className="flex items-center gap-2 text-red-600 text-xs font-semibold bg-red-50 p-2.5 rounded-lg border border-red-100">
                    <AlertCircle size={14} />
                    {erro}
                </div>
            )}

            {/* Modal de recorte: abre assim que um arquivo é escolhido */}
            {arquivoOriginal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800 text-sm">Ajustar recorte da imagem</h3>
                            <button type="button" onClick={cancelarRecorte} className="text-slate-400 hover:text-slate-600">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="relative w-full bg-slate-900" style={{ aspectRatio: aspect, maxHeight: '55vh' }}>
                            <Cropper
                                image={arquivoOriginal.url}
                                crop={crop}
                                zoom={zoom}
                                aspect={aspect}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                            />
                        </div>

                        <div className="px-5 py-4 space-y-3">
                            <label className="flex items-center gap-3 text-xs font-semibold text-slate-600">
                                <ZoomIn size={16} className="text-slate-400 flex-shrink-0" />
                                <input
                                    type="range"
                                    min={1}
                                    max={3}
                                    step={0.01}
                                    value={zoom}
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full accent-indigo-600"
                                />
                            </label>
                            <p className="text-xs text-slate-400">Arraste a imagem pra reposicionar e use a barra pra aproximar/afastar.</p>

                            {erro && (
                                <div className="flex items-center gap-2 text-red-600 text-xs font-semibold bg-red-50 p-2.5 rounded-lg border border-red-100">
                                    <AlertCircle size={14} />
                                    {erro}
                                </div>
                            )}

                            <div className="flex items-center gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={cancelarRecorte}
                                    disabled={enviando}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-60"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmarRecorte}
                                    disabled={enviando}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm transition-colors disabled:opacity-60"
                                >
                                    {enviando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                    {enviando ? 'Enviando...' : 'Usar este recorte'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}