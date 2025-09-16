INSERT INTO users (id, nome, sobrenome, email, contato, password, status, created_at, updated_at) 
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Teste',
  'Usuario',
  'teste@teste.com',
  '11999999999',
  '$2b$10$rQZ8K9vX8vX8vX8vX8vX8u', -- hash da senha '12345678'
  1,
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;
