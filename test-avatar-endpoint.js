const fetch = require('node-fetch');

async function testAvatarEndpoint() {
  try {
    console.log('🧪 Testando endpoint de avatar...');
    
    // Testar se o endpoint está acessível
    const response = await fetch('http://localhost:3000/users/me/avatar/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('📡 Status:', response.status);
    console.log('📡 Headers:', response.headers);
    
    if (response.status === 401) {
      console.log('✅ Endpoint encontrado! (401 é esperado sem autenticação)');
    } else if (response.status === 404) {
      console.log('❌ Endpoint não encontrado (404)');
    } else {
      console.log('📊 Resposta inesperada:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar:', error.message);
  }
}

// Aguardar um pouco para o backend inicializar
setTimeout(testAvatarEndpoint, 3000);
