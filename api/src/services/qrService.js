const QRCode = require('qrcode');

/**
 * PayCraft QR Service — single source of truth for generating and parsing
 * Payment Interface (PI) QR payloads.
 *
 * The /pi/qr route calls QRService.generateQR(payloadString) and expects
 * back a base64 PNG data URL that the frontend can drop into <img src=...>.
 */
class QRService {
  /**
   * Build a structured PI QR payload (JSON). Used for closed-loop PayCraft
   * flows where the scanner already knows it's a PayCraft code.
   */
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

  /**
   * Render a QR Code Data URL (base64 PNG) from any payload string.
   * This is what the frontend's <img src=...> expects.
   */
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

  /**
   * Back-compat alias — keep so anything that still calls generateDataUrl
   * keeps working while callers migrate to generateQR.
   */
  static generateDataUrl(payloadString) {
    return QRService.generateQR(payloadString);
  }

  /**
   * Parse and validate a scanned PayCraft QR payload.
   */
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