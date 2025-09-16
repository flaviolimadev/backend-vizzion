const fetch = require('node-fetch');

async function testPayment() {
  try {
    console.log('🧪 Testando endpoint de pagamentos...');
    
    const response = await fetch('http://localhost:3000/payments/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        amount: 10000,
        method: 'PIX',
        description: 'Teste de pagamento'
      })
    });
    
    const data = await response.text();
    console.log('📊 Status:', response.status);
    console.log('📋 Response:', data);
    
    if (response.status === 401) {
      console.log('✅ Endpoint funcionando (retornou 401 - Unauthorized, como esperado)');
    } else {
      console.log('❌ Resposta inesperada');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testPayment();
