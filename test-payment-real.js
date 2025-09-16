const fetch = require('node-fetch');

async function testRealPayment() {
  try {
    console.log('🧪 Testando pagamento real com VizzionPay...');
    
    const response = await fetch('http://localhost:3000/payments/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
      },
      body: JSON.stringify({
        amount: 10000, // R$ 100,00
        method: 'PIX',
        description: 'Teste de pagamento real',
        customer: {
          name: 'João Silva',
          email: 'joao@email.com',
          phone: '11999999999',
          documentType: 'CPF',
          document: '12345678901'
        }
      })
    });
    
    const data = await response.text();
    console.log('📊 Status:', response.status);
    console.log('📋 Response:', data);
    
    if (response.status === 200) {
      console.log('✅ Pagamento criado com sucesso!');
    } else {
      console.log('❌ Erro na criação do pagamento');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testRealPayment();
