const QRCode = require('qrcode');

const generateQRCode = async (ticketData) => {
  try {
    const data = JSON.stringify(ticketData);
    const qrCode = await QRCode.toDataURL(data);
    return qrCode;
  } catch (error) {
    throw new Error('QR code generation failed');
  }
};

module.exports = { generateQRCode };
