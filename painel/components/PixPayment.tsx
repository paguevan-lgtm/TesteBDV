import React, { useState } from 'react';
import { Button } from './Shared';

const PixForm = ({ amount, userId, systemContext, email }: any) => {
    const [loading, setLoading] = useState(false);
    const [pixDetails, setPixDetails] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handlePixPayment = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/create-pix-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, userId, systemContext, email })
            });
            
            if (!response.ok) {
                const text = await response.text();
                console.error('Server error response:', text);
                throw new Error('O servidor retornou um erro. Tente novamente mais tarde.');
            }

            const data = await response.json();
            
            if (data.qrCodeBase64) {
                setPixDetails(data);
            } else {
                throw new Error('Failed to generate PIX');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Erro ao processar PIX. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            {!pixDetails ? (
                <Button onClick={handlePixPayment} disabled={loading} className="w-full py-3">
                    {loading ? 'Gerando PIX...' : 'Gerar QR Code PIX'}
                </Button>
            ) : (
                <div className="text-center space-y-4">
                    <p className="text-white">Escaneie o QR Code abaixo:</p>
                    <img src={pixDetails.qrCodeBase64} alt="PIX QR Code" className="mx-auto" />
                    <p className="text-slate-400 text-xs break-all">Código: {pixDetails.qrCode}</p>
                </div>
            )}
        </div>
    );
};

export const PixPayment = (props: any) => (
    <PixForm {...props} />
);
