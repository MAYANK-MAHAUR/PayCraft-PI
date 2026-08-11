const QRCode = require('qrcode');

class QRService {
  static generatePayload({ transactionId, merchantId, amount, currency = 'USD', businessName = 'PayCraft Merchant' }) {
    const payloadObject = {
      protocol: 'paycraft_qr_v1',
      tx: transactionId,
      m: merchantId,
      merchant: businessName,
      amt: amount,
      cur: currency.toUpperCase(),
      ts: Date.now(),
    };

    return JSON.stringify(payloadObject);
  }

  static async generateQR(payloadString) {
    try {
      const dataUrl = await QRCode.toDataURL(payloadString, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.95,
        margin: 2,
        color: {
          dark: '#0B0B0B',  // PayCraft black
          light: '#FFFFFF',
        },
        width: 320,
      });
      return dataUrl;
    } catch (err) {
      console.error('Failed to generate QR Data URL:', err);
      throw err;
    }
  }

  static generateDataUrl(payloadString) {
    return QRService.generateQR(payloadString);
  }

  static parsePayload(payloadString) {
    try {
      const parsed = typeof payloadString === 'object' ? payloadString : JSON.parse(payloadString);

      if (!parsed.tx || !parsed.amt) {
        throw new Error('Invalid QR payload format. Missing transaction ID or amount.');
      }

      return parsed;
    } catch (err) {
      throw new Error('Invalid or corrupted QR payload string');
    }
  }
}

module.exports = QRService;