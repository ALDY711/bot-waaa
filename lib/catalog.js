//﹌﹌﹌﹌﹌﹌﹌﹌﹌﹌﹌﹌//
//    </>  𝐂𝐫𝐞𝐝𝐢𝐭𝐬  </>      //
//      𝐂𝐫𝐞𝐚𝐭𝐨𝐫: 𝐀𝐋𝐃𝐘        //
//   𝐁𝐚𝐬𝐞: 𝐀𝐋𝐃𝐘 𝐁𝐚𝐢𝐥𝐞𝐲𝐬    //
//﹌﹌﹌﹌﹌﹌﹌﹌﹌﹌﹌﹌﹌//

const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

/**
 * Format angka ke format mata uang Rupiah
 * @param {number} num 
 * @returns {string}
 */
function formatRupiah(num) {
  if (isNaN(num)) return 'Rp 0';
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}

/**
 * Mengambil Buffer media dari pesan (image / view-once)
 * @param {object} mediaContent Objek pesan media WhatsApp
 * @param {string} mediaType Tipe media ('image', 'video', dsb)
 * @returns {Promise<Buffer>}
 */
async function downloadMedia(mediaContent, mediaType = 'image') {
  const stream = await downloadContentFromMessage(mediaContent, mediaType);
  let buffer = Buffer.from([]);
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }
  return buffer;
}

/**
 * Membuat dan mengunggah produk baru ke katalog WhatsApp Business
 * @param {object} sock Instance Baileys socket
 * @param {object} productData Data produk
 * @param {string} productData.name Nama produk
 * @param {string} [productData.description] Deskripsi produk
 * @param {number} productData.price Harga produk
 * @param {string} [productData.currency='IDR'] Mata uang (default IDR)
 * @param {string} [productData.retailerId] SKU / ID Toko produk
 * @param {Array<Buffer|object>} productData.images Array gambar (Buffer / URL)
 * @param {string} [productData.originCountryCode='ID'] Kode negara asal
 * @param {boolean} [productData.isHidden=false] Apakah disembunyikan
 * @returns {Promise<object>} Objek produk hasil dari WhatsApp
 */
async function createCatalogProduct(sock, {
  name,
  description = '',
  price,
  currency = 'IDR',
  retailerId = '',
  images = [],
  originCountryCode = 'ID',
  isHidden = false
}) {
  if (typeof sock.productCreate !== 'function') {
    throw new Error('Socket Baileys tidak memiliki fungsi productCreate. Pastikan menggunakan aldy-baileys.');
  }

  if (!name || name.trim() === '') {
    throw new Error('Nama produk tidak boleh kosong!');
  }

  const parsedPrice = Number(price);
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    throw new Error('Harga produk harus berupa angka yang valid!');
  }

  if (!images || images.length === 0) {
    throw new Error('Produk harus memiliki minimal 1 gambar!');
  }

  const payload = {
    name: name.trim(),
    description: (description || '').trim(),
    price: parsedPrice,
    currency: currency.toUpperCase(),
    images: images,
    isHidden: Boolean(isHidden)
  };

  if (retailerId && retailerId.trim()) {
    payload.retailerId = retailerId.trim();
  }

  if (originCountryCode && originCountryCode.trim()) {
    payload.originCountryCode = originCountryCode.trim().toUpperCase();
  }

  return await sock.productCreate(payload);
}

/**
 * Mengambil daftar produk katalog WhatsApp
 * @param {object} sock Instance Baileys socket
 * @param {object} options Opsi filter katalog
 * @param {string} [options.jid] JID target (default akun bot)
 * @param {number} [options.limit=10] Jumlah produk per halaman
 * @param {string} [options.cursor] Cursor halaman berikutnya
 * @returns {Promise<{ products: Array<object>, nextPageCursor?: string }>}
 */
async function fetchCatalog(sock, { jid, limit = 10, cursor } = {}) {
  if (typeof sock.getCatalog !== 'function') {
    throw new Error('Socket Baileys tidak memiliki fungsi getCatalog.');
  }
  return await sock.getCatalog({ jid, limit, cursor });
}

/**
 * Menghapus satu atau beberapa produk dari katalog WhatsApp
 * @param {object} sock Instance Baileys socket
 * @param {string|Array<string>} productIds ID produk yang akan dihapus
 * @returns {Promise<{ deleted: number }>}
 */
async function removeCatalogProducts(sock, productIds) {
  if (typeof sock.productDelete !== 'function') {
    throw new Error('Socket Baileys tidak memiliki fungsi productDelete.');
  }
  const ids = Array.isArray(productIds) ? productIds : [productIds];
  return await sock.productDelete(ids);
}

/**
 * Mengambil daftar koleksi/kategori katalog WhatsApp
 * @param {object} sock Instance Baileys socket
 * @param {string} [jid] JID target (default akun bot)
 * @param {number} [limit=20] Batas jumlah koleksi
 * @returns {Promise<{ collections: Array<object> }>}
 */
async function fetchCollections(sock, jid, limit = 20) {
  var _a;
  jid = jid || ((_a = sock.authState?.creds?.me) === null || _a === void 0 ? void 0 : _a.id);
  if (sock.decodeJid) {
    jid = sock.decodeJid(jid);
  }

  const queryWithTimeout = (promise, ms = 10000) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timed Out')), ms))
    ]);
  };

  try {
    if (typeof sock.getCollections === 'function') {
      return await queryWithTimeout(sock.getCollections(jid, limit), 8000);
    }
  } catch (errFirst) {
    // Fallback: Jika getCollections bawaan (yang menggunakan smax_id: 35) gagal atau timed out,
    // coba query langsung tanpa atribut smax_id
    try {
      const { parseCollectionsNode } = require('@whiskeysockets/baileys/lib/Utils/business');
      const result = await queryWithTimeout(sock.query({
        tag: 'iq',
        attrs: {
          to: '@s.whatsapp.net',
          type: 'get',
          xmlns: 'w:biz:catalog'
        },
        content: [
          {
            tag: 'collections',
            attrs: {
              'biz_jid': jid
            },
            content: [
              { tag: 'collection_limit', attrs: {}, content: Buffer.from(limit.toString()) },
              { tag: 'item_limit', attrs: {}, content: Buffer.from(limit.toString()) },
              { tag: 'width', attrs: {}, content: Buffer.from('100') },
              { tag: 'height', attrs: {}, content: Buffer.from('100') }
            ]
          }
        ]
      }), 8000);
      return parseCollectionsNode(result);
    } catch (errSecond) {
      throw new Error('Server WhatsApp tidak merespons query koleksi (Timed Out). Hal ini umum terjadi jika di aplikasi WhatsApp Business Anda belum pernah dibuat "Koleksi" (Kategori) di menu Katalog.');
    }
  }
}

module.exports = {
  formatRupiah,
  downloadMedia,
  createCatalogProduct,
  fetchCatalog,
  removeCatalogProducts,
  fetchCollections
};
