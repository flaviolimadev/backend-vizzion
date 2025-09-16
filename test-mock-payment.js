const mockPixCode = `00020126580014br.gov.bcb.pix0136mock${Date.now()}5204000053039865405${(2000 / 100).toFixed(2).replace('.', '')}5802BR5913Vizzion Bot6009Sao Paulo62070503***6304MOCK`;
const mockQrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(mockPixCode)}&size=200`;
const mockExpirationDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();

console.log('Mock PIX Code:', mockPixCode);
console.log('Mock QR Code URL:', mockQrCodeUrl);
console.log('Mock Expiration:', mockExpirationDate);

const mockPayment = {
  status: true,
  data: {
    id: `mock_${Date.now()}`,
    status: "PENDING",
    amount: 2000,
    method: "PIX",
    pix: {
      qrcode: mockQrCodeUrl,
      qrcodeUrl: mockQrCodeUrl,
      copyPaste: mockPixCode,
      expirationDate: mockExpirationDate,
    },
    txid: `mock_${Date.now()}`,
    createdAt: new Date().toISOString(),
  },
};

console.log('Mock Payment:', JSON.stringify(mockPayment, null, 2));
