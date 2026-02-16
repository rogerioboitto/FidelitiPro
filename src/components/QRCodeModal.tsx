
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Share2, Copy, Check } from 'lucide-react';

interface QRCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    url: string;
    storeName: string;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, url, storeName }) => {
    const [copied, setCopied] = React.useState(false);

    if (!isOpen) return null;

    const downloadQRCode = () => {
        const svg = document.getElementById('qr-code-svg');
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width + 80;
            canvas.height = img.height + 160;
            if (ctx) {
                // Background
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw QR
                ctx.drawImage(img, 40, 40);

                // Text
                ctx.fillStyle = '#1e293b';
                ctx.font = 'bold 24px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(storeName, canvas.width / 2, img.height + 80);

                ctx.fillStyle = '#64748b';
                ctx.font = '16px Inter, sans-serif';
                ctx.fillText('Escaneie para ver seus pontos', canvas.width / 2, img.height + 110);
            }

            const pngFile = canvas.toDataURL('image/png');
            const downloadLink = document.createElement('a');
            downloadLink.download = `qrcode-${storeName.toLowerCase().replace(/\s+/g, '-')}.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    const copyUrl = () => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Share2 size={20} />
                        <h2 className="font-black uppercase text-xs tracking-widest">Compartilhar Loja</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-10 flex flex-col items-center text-center">
                    <div className="bg-slate-50 p-8 rounded-[2.5rem] mb-8 shadow-inner border border-slate-100">
                        <QRCodeSVG
                            id="qr-code-svg"
                            value={url}
                            size={200}
                            level="H"
                            includeMargin={false}
                            className="rounded-xl"
                        />
                    </div>

                    <h3 className="font-black text-slate-800 text-lg mb-2 uppercase tracking-tight">{storeName}</h3>
                    <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed px-4">
                        Mostre este código para seus clientes acessarem o portal e consultarem seus pontos.
                    </p>

                    <div className="grid grid-cols-2 gap-4 w-full">
                        <button
                            onClick={downloadQRCode}
                            className="flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg"
                        >
                            <Download size={16} /> Baixar PNG
                        </button>
                        <button
                            onClick={copyUrl}
                            className={`flex items-center justify-center gap-2 py-4 border-2 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${copied ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copiado!' : 'Copiar Link'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QRCodeModal;
