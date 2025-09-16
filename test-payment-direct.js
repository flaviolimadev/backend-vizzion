const { ConfigModule, ConfigService } = require('@nestjs/config');

async function testVizzionPay() {
  console.log('🚀 Testando VizzionPay API diretamente...');
  
  const apiKey = 'perolatranding_2nke6vk7l8uj02h2';
  const apiSecret = 'owhamnl4y7xbrsdp4zviu9qkdy1j9p2eu01mh4qxv7f9l2b0sqnmxsoievi8f9cs';
  const baseUrl = 'https://app.vizzionpay.com/api/v1';
  
  const identifier = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const amountInReais = 20; // R$ 20,00
  
  const body = {
    identifier: identifier,
    clientIdentifier: identifier,
    callbackUrl: "https://backend.iprobet.click/api",
    amount: amountInReais,
    discountFeeOfReceiver: false,
    client: {
      name: "Teste",
      email: "teste2@teste.com",
      phone: "11999999998",
      documentType: "CPF",
      document: "11591670446"
    },
    pix: {
      type: "email",
      key: "teste2@teste.com"
    },
    owner: {
      ip: "108.181.224.233",
      name: "Teste",
      document: {
        type: "cpf",
        number: "11591670446"
      }
    }
  };

  console.log('📤 Enviando dados para VizzionPay:', JSON.stringify(body, null, 2));

  try {
    const response = await fetch(`${baseUrl}/gateway/pix/receive`, {
      method: 'POST',
      headers: {
        'x-public-key': apiKey,
        'x-secret-key': apiSecret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('📥 Status da resposta:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro da API VizzionPay:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ Resposta da API recebida:', JSON.stringify(data, null, 2));
    
    const pixCode = data.pix?.code || '';
    const qrCodeUrl = pixCode ? `https://quickchart.io/qr?text=${encodeURIComponent(pixCode)}&size=300` : '';
    
    console.log('🎉 SUCESSO! PIX gerado:');
    console.log('- Transaction ID:', data.transactionId);
    console.log('- Status:', data.status);
    console.log('- PIX Code:', pixCode);
    console.log('- QR Code URL:', qrCodeUrl);

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testVizzionPay();
