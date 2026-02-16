
declare global {
    interface Window {
        MercadoPago: any;
    }
}

const MP_PUBLIC_KEY = 'APP_USR-b8075797-d113-419c-ae28-5692b8e10efa';
const MP_ACCESS_TOKEN = 'APP_USR-5714172573519689-012517-d2816e5f4e31bdeb22bb57da8d9510e1-74121383';

export const PaymentService = {
    async createPreference(storeId: string, planName: string, price: number) {
        try {
            const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    items: [
                        {
                            title: `Assinatura FidelitiPro - Plano ${planName}`,
                            unit_price: price,
                            quantity: 1,
                            currency_id: 'BRL'
                        }
                    ],
                    external_reference: storeId,
                    back_urls: {
                        success: `${window.location.origin}/dashboard?payment=success&plan=${planName}`,
                        failure: `${window.location.origin}/dashboard?payment=failure`,
                        pending: `${window.location.origin}/dashboard?payment=pending`
                    },
                    auto_return: 'approved'
                })
            });

            const data = await response.json();
            return data.id; // Preference ID
        } catch (error) {
            console.error('Erro ao criar preferência de pagamento:', error);
            throw error;
        }
    },

    openCheckout(preferenceId: string) {
        if (!window.MercadoPago) {
            console.error('Mercado Pago SDK não carregado');
            return;
        }

        const mp = new window.MercadoPago(MP_PUBLIC_KEY, {
            locale: 'pt-BR'
        });

        mp.checkout({
            preference: {
                id: preferenceId
            },
            autoOpen: true
        });
    }
};
