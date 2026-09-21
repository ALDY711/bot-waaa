const { prepareWAMessageMedia, downloadContentFromMessage } = require("@whiskeysockets/baileys");

/**
 * Daftar palet warna ARGB untuk status latar teks
 */
const STATUS_COLORS = [
  0xff1e293b, // Slate Dark
  0xff0d9488, // Teal
  0xff7c3aed, // Violet
  0xffdb2777, // Pink
  0xffea580c, // Orange
  0xff2563eb, // Royal Blue
  0xff16a34a, // Emerald Green
  0xffb91c1c, // Crimson Red
  0xff4f46e5, // Indigo
];

function getRandomColor() {
  return STATUS_COLORS[Math.floor(Math.random() * STATUS_COLORS.length)];
}

/**
 * Mengunduh media stream menjadi Buffer
 */
async function downloadMedia(mediaContent, mediaType) {
  const stream = await downloadContentFromMessage(mediaContent, mediaType);
  let buffer = Buffer.from([]);
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }
  return buffer;
}

/**
 * Mengekstrak media dari pesan atau pesan yang di-reply (quoted)
 */
async function extractMedia(m) {
  const target = m.quoted ? m.quoted : m;
  const qMsg = target.msg || target.message || target;
  if (!qMsg) return null;

  const viewOnce = qMsg.viewOnceMessageV2?.message ||
    qMsg.viewOnceMessage?.message ||
    qMsg.viewOnceMessageV2Extension?.message ||
    qMsg;

  const mediaType = viewOnce.imageMessage ? 'image' :
    viewOnce.videoMessage ? 'video' :
    viewOnce.audioMessage ? 'audio' : null;

  const mediaContent = viewOnce.imageMessage || viewOnce.videoMessage || viewOnce.audioMessage;
  if (!mediaType || !mediaContent) return null;

  const buffer = await downloadMedia(mediaContent, mediaType);
  return {
    buffer,
    mediaType,
    caption: mediaContent.caption || ''
  };
}

/**
 * Mengirim pesan Status langsung di dalam room Grup (groupStatusMessageV2)
 * @param {object} sock - Instance Baileys socket
 * @param {string} jid - Remote JID grup (xxx@g.us)
 * @param {object} param - Opsi pesan status
 * @param {string} [param.text] - Pesan teks status
 * @param {Buffer} [param.buffer] - Buffer media jika berupa gambar/video/audio
 * @param {string} [param.mediaType] - 'image' | 'video' | 'audio'
 * @param {number} [param.backgroundColor] - Warna ARGB latar status
 * @param {number} [param.textColor] - Warna ARGB teks status
 * @param {number} [param.font] - Nomor font (1-5)
 * @param {number} [param.audienceType] - 0 untuk publik/default
 * @param {object} [quoted] - Pesan yang di-quote
 */
async function sendGroupStatus(sock, jid, {
  text,
  buffer,
  mediaType,
  backgroundColor,
  textColor,
  font = 1,
  audienceType = 0
}, quoted = null) {
  if (buffer && mediaType) {
    const prep = await prepareWAMessageMedia(
      { [mediaType]: buffer },
      { upload: sock.waUploadToServer }
    );
    if (text && prep[mediaType + 'Message']) {
      prep[mediaType + 'Message'].caption = text;
    }
    return await sock.sendMessage(jid, {
      groupStatus: {
        message: prep,
        audienceType
      }
    }, { quoted });
  } else {
    return await sock.sendMessage(jid, {
      groupStatus: {
        message: text,
        backgroundArgb: backgroundColor || getRandomColor(),
        textArgb: textColor || 0xffffffff,
        font: font || 1,
        audienceType
      }
    }, { quoted });
  }
}

/**
 * Mengirim WhatsApp Story (status 24 jam) yang audiensnya HANYA anggota grup target
 * @param {object} sock - Instance Baileys socket
 * @param {string} groupJid - JID grup target
 * @param {object} param - Konten status
 * @param {string} [param.text] - Teks status
 * @param {Buffer} [param.buffer] - Buffer media gambar/video
 * @param {string} [param.mediaType] - 'image' | 'video'
 * @param {string} [param.backgroundColor] - Kode warna hex (misal '#1E293B')
 * @param {number} [param.font] - Nomor font (1-5)
 */
async function sendGroupStory(sock, groupJid, {
  text,
  buffer,
  mediaType,
  backgroundColor = '#1E293B',
  font = 1
}) {
  const meta = await sock.groupMetadata(groupJid);
  const participants = (meta?.participants || []).map(p => p.id);
  if (!participants.length) {
    throw new Error('Gagal mengambil daftar peserta grup.');
  }

  if (buffer && mediaType) {
    const isImage = mediaType === 'image';
    const isVideo = mediaType === 'video';
    const mediaPayload = isImage ? { image: buffer } : isVideo ? { video: buffer } : null;

    if (!mediaPayload) {
      throw new Error(`Tipe media ${mediaType} tidak didukung untuk status story.`);
    }

    if (text) {
      mediaPayload.caption = text;
    }

    return await sock.sendMessage('status@broadcast', mediaPayload, {
      statusJidList: participants,
      broadcast: true
    });
  } else {
    return await sock.sendMessage('status@broadcast', {
      text: text,
      backgroundColor: backgroundColor,
      font: font
    }, {
      statusJidList: participants,
      broadcast: true
    });
  }
}

module.exports = {
  sendGroupStatus,
  sendGroupStory,
  extractMedia,
  getRandomColor,
  STATUS_COLORS
};
