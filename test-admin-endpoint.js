// Script para testar o endpoint admin/pix-transfer
const fetch = require('node-fetch');

async function testAdminEndpoint() {
  try {
    // Fazer login primeiro para obter o token
    console.log('🔐 Fazendo login...');
    const loginResponse = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'assmdx@gmail.com',
        password: '123456' // Substitua pela senha correta
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.accessToken;
    
    console.log('✅ Login realizado com sucesso');
    console.log('🔑 Token obtido:', token.substring(0, 20) + '...');

    // Testar endpoint admin
    console.log('🧪 Testando endpoint admin/pix-transfer...');
    const testData = {
      clientIdentifier: 'test-123',
      callbackUrl: 'https://example.com/callback',
      amount: 100,
      discountFeeOfReceiver: false, // Taxa já descontada no backend
      pix: {
        type: 'email',
        key: 'test@example.com'
      },
      owner: {
        ip: '192.168.1.1',
        name: 'Test User',
        document: {
          type: 'cpf',
          number: '12345678900'
        }
      }
    };

    const adminResponse = await fetch('http://localhost:3000/admin/pix-transfer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testData)
    });

    console.log('📊 Status da resposta:', adminResponse.status);
    
    if (adminResponse.ok) {
      const result = await adminResponse.json();
      console.log('✅ Endpoint funcionando! Resposta:', result);
    } else {
      const error = await adminResponse.text();
      console.log('❌ Erro no endpoint:', error);
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testAdminEndpoint();
