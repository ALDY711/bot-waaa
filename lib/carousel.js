const { proto, generateWAMessageFromContent, prepareWAMessageMedia } = require("@whiskeysockets/baileys");
const fs = require('fs');
const axios = require('axios');

/**
 * Mengirim pesan Carousel Interaktif di WhatsApp
 * @param {object} sock - Instance Baileys socket
 * @param {string} jid - Remote JID tujuan
 * @param {object} options - Konfigurasi carousel
 * @param {string} [options.body] - Teks utama / caption carousel
 * @param {string} [options.footer] - Teks footer utama
 * @param {Array<object>} options.cards - Daftar kartu carousel
 * @param {object} [quoted] - Pesan yang di-quote
 */
async function sendCarousel(sock, jid, { body = '', footer = '', cards = [] }, quoted = null) {
  const formattedCards = [];

  for (const card of cards) {
    let header = {
      title: card.title || '',
      hasMediaAttachment: false
    };

    if (card.image) {
      try {
        let imageInput;
        if (Buffer.isBuffer(card.image)) {
          imageInput = card.image;
        } else if (typeof card.image === 'string' && fs.existsSync(card.image)) {
          imageInput = fs.readFileSync(card.image);
        } else if (typeof card.image === 'string' && card.image.startsWith('http')) {
          try {
            const dl = await axios.get(card.image, {
              responseType: 'arraybuffer',
              timeout: 10000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
            imageInput = Buffer.from(dl.data);
          } catch (eDl) {
            imageInput = { url: card.image };
          }
        } else {
          imageInput = card.image;
        }

        const media = await prepareWAMessageMedia(
          { image: imageInput },
          { upload: sock.waUploadToServer }
        );
        header = {
          imageMessage: media.imageMessage,
          hasMediaAttachment: true
        };
      } catch (err) {
        console.error("Gagal mengupload gambar untuk kartu carousel:", err);
      }
    }

    const nativeButtons = (card.buttons || []).map((btn) => {
      if (btn.name && btn.buttonParamsJson) {
        return btn;
      }
      if (btn.url) {
        return {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: btn.text || btn.displayText || "Buka Tautan",
            url: btn.url,
            merchant_url: btn.url
          })
        };
      }
      if (btn.copy) {
        return {
          name: "cta_copy",
          buttonParamsJson: JSON.stringify({
            display_text: btn.text || btn.displayText || "Salin Teks",
            copy_code: btn.copy
          })
        };
      }
      return {
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({
          display_text: btn.text || btn.displayText || "Pilih",
          id: btn.id || btn.text || "action"
        })
      };
    });

    formattedCards.push({
      header,
      body: { text: card.body || card.text || '' },
      footer: { text: card.footer || '' },
      nativeFlowMessage: {
        buttons: nativeButtons
      }
    });
  }

  const message = {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2
        },
        interactiveMessage: {
          body: { text: body },
          footer: { text: footer },
          header: {
            title: '',
            hasMediaAttachment: false
          },
          carouselMessage: {
            cards: formattedCards,
            messageVersion: 1
          }
        }
      }
    }
  };

  const fullMsg = generateWAMessageFromContent(jid, message, { quoted: quoted || undefined });
  return await sock.relayMessage(jid, fullMsg.message, { messageId: fullMsg.key.id });
}

module.exports = { sendCarousel };
