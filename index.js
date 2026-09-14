
//﹌﹌﹌﹌﹌﹌﹌﹌﹌﹌﹌﹌//
//    </>  𝐂𝐫𝐞𝐝𝐢𝐭𝐬  </>      //
//      𝐂𝐫𝐞𝐚𝐭𝐨𝐫: 𝐀𝐋𝐃𝐘        //
//   𝐁𝐚𝐬𝐞: 𝐀𝐋𝐃𝐘 𝐁𝐚𝐢𝐥𝐞𝐲𝐬    //
//﹌﹌﹌﹌﹌﹌﹌﹌﹌﹌﹌﹌﹌//

// ===================={ ANTI-CRASH SYSTEM (RAILWAY / VPS / LOCAL) }==================== //
process.on('uncaughtException', (err, origin) => {
  console.log('\x1b[31m[ANTI-CRASH] Uncaught Exception:\x1b[0m', err?.message || err);
  if (err?.stack) console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.log('\x1b[31m[ANTI-CRASH] Unhandled Rejection:\x1b[0m', reason?.message || reason);
  if (reason?.stack) console.error(reason.stack);
});

process.on('uncaughtExceptionMonitor', (err, origin) => {
  console.log('\x1b[33m[ANTI-CRASH MONITOR] Origin:\x1b[0m', origin, err?.message || err);
});

require('./control/settings');
const {
  default: makeWASocket,
  prepareWAMessageMedia,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeInMemoryStore,
  jidDecode,
  jidNormalizedUser,
  downloadContentFromMessage,
  makeCacheableSignalKeyStore,
  updateProfileStatus
} = require("@whiskeysockets/baileys");
const NodeCacheRaw = require('@cacheable/node-cache');
const NodeCache = NodeCacheRaw.default || NodeCacheRaw.NodeCache || NodeCacheRaw;
const pino = require('pino');
const readline = require("readline");
const fs = require('fs');
const http = require('http');
const chalk = require("chalk");
const { smsg, getBuffer, getSizeMedia } = require('./lib/myfunc');

const usePairingCode = true;

// Web server keep-alive & health check untuk Railway / VPS
let serverStarted = false;
function startHealthServer() {
  if (serverStarted) return;
  serverStarted = true;
  const PORT = process.env.PORT || 3000;
  http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ALDY Bot WhatsApp is running!\n');
  }).listen(PORT, () => {
    console.log(chalk.green(`[SERVER] Health check server aktif di port ${PORT}`));
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(chalk.yellow(`[SERVER] Port ${PORT} sudah digunakan, bot tetap berjalan normal.`));
    } else {
      console.log(chalk.red(`[SERVER ERROR]`, err.message));
    }
  });
}
startHealthServer();

const question = (text) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(text, (ans) => {
      rl.close();
      resolve(ans);
    });
  });
};

// Inisialisasi Cache retry counter untuk mencegah loop pengiriman ulang pesan
const msgRetryCounterCache = new NodeCache({ stdTTL: 3600, useClones: false });

const store = makeInMemoryStore({ logger: pino({ level: 'silent' }) });

// Muat riwayat pesan dari file jika tersedia
const sessionDir = global.session ? `./${global.session}` : "./session";
const storeFile = `${sessionDir}/baileys_store.json`;
if (fs.existsSync(storeFile)) {
  try {
    store.readFromFile(storeFile);
  } catch (err) {
    // Abaikan jika file store kosong/rusak
  }
}

// Simpan store secara berkala setiap 30 detik
setInterval(() => {
  try {
    if (fs.existsSync(sessionDir)) {
      store.writeToFile(storeFile);
    }
  } catch (err) {}
}, 30_000);

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    printQRInTerminal: !usePairingCode,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    logger: pino({ level: 'silent' }),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },
    msgRetryCounterCache,
    getMessage: async (key) => {
      const jid = jidNormalizedUser ? jidNormalizedUser(key.remoteJid) : key.remoteJid;
      let msg = await store.loadMessage(jid, key.id);
      if (!msg && key.remoteJid !== jid) {
        msg = await store.loadMessage(key.remoteJid, key.id);
      }
      return msg?.message || undefined;
    }
  });

  const client = sock
  const conn = client

  sock.decodeJid = (jid) => {
    if (!jid) return jid
    if (/:\d+@/gi.test(jid)) {
      const decode = jidDecode(jid) || {}
      return decode.user && decode.server ? decode.user + '@' + decode.server : jid
    }
    return jid
  }

  store.bind(sock.ev);

  if (usePairingCode && !sock.authState.creds.registered) {
    // Ambil nomor otomatis dari:
    // 1. Environment Variable: BOT_NUMBER (Sangat praktis di tab Variables Railway)
    // 2. Setting file: global.botNumber (di control/settings.js)
    // 3. Fallback: global.owner[0]
    let phoneNumber = process.env.BOT_NUMBER || global.botNumber || (global.owner && global.owner[0]) || "";
    phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

    if (!phoneNumber) {
      if (process.stdin.isTTY) {
        phoneNumber = await question(chalk.yellow(`\nSilahkan masukkan nomor WhatsApp bot (contoh: 628xxx):\n> `));
        phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
      } else {
        console.log(chalk.red.bold("\n[ERROR] Nomor bot belum disetting! Isi di control/settings.js (global.botNumber) atau Environment Variable (BOT_NUMBER)."));
      }
    }

    if (phoneNumber) {
      console.log(chalk.yellow(`\n[PAIRING] Meminta Pairing Code otomatis untuk nomor: ${phoneNumber}...`));
      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode(phoneNumber, "ALDY1045");
          console.log(chalk.black(chalk.bgGreen.bold("\n========================================")));
          console.log(chalk.black(chalk.bgGreen.bold(`       KODE PAIRING WHATSAPP:           `)));
          console.log(chalk.yellow.bold(`             ${code}                   `));
          console.log(chalk.black(chalk.bgGreen.bold("========================================")));
          console.log(chalk.cyan(`👉 Buka WhatsApp di HP > Perangkat Tertaut > Tautkan Perangkat > Tautkan dengan nomor telepon saja > Masukkan kode: ${code}\n`));
        } catch (errPair) {
          console.log(chalk.red("[PAIRING ERROR]", errPair?.message || errPair));
        }
      }, 3000);
    }
  }

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const mek = messages[0];
      if (!mek || !mek.message) return;
      if (mek.key.remoteJid === 'status@broadcast') return;

      const m = smsg(sock, mek, store);
      if (!m) return;

      const senderJid = (m.sender || mek.key.remoteJid || '').replace(/:\d+(?=@)/, '');
      const isCreator = [sock?.user?.id, ...(global.owner || [])]
        .map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
        .includes(senderJid);

      // Tampilkan SEMUA pesan masuk ke log terminal tanpa filter
      const chatType = m.isGroup ? `[GRUP: ${m.chat}]` : '[PC]';
      const fromTag = mek.key.fromMe ? '[DARI SAYA/BOT]' : '[DARI PENGIRIM]';
      const pushNameStr = m.pushName ? `(${m.pushName})` : '';
      const textPreview = m.text || (m.mtype ? `[Media/Tipe: ${m.mtype}]` : '[Pesan Tanpa Teks]');

      console.log(chalk.cyan(`[PESAN MASUK] ${chatType} ${fromTag} ${senderJid} ${pushNameStr}: ${textPreview}`));

      // Filter hak akses bot jika mode Self (Pribadi)
      if (!sock.public && !mek.key.fromMe && !isCreator) {
        console.log(chalk.gray(`   └── [FILTER MODE SELF] Pesan dari ${senderJid} tidak diproses karena bot dalam mode pribadi.`));
        return;
      }
      if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return;

      await require("./aldy")(sock, m, messages, store).catch((err) => {
        console.error(chalk.red.bold("\n[ERROR HANDLER ALDY]:"), err);
      });

    } catch (e) {
      console.error(chalk.red.bold("\n[ERROR MESSAGES.UPSERT]:"), e);
    }
  });

  // Default Mode: Pribadi (Self) - Hanya bisa digunakan oleh nomor sendiri / owner
  sock.public = false;

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      console.log(chalk.greenBright("\n========================================"));
      console.log(chalk.greenBright("  ✅ BOT BERHASIL TERHUBUNG KE WHATSAPP!"));
      console.log(chalk.greenBright("========================================\n"));
    }
    if (connection === 'close') {
      console.error(chalk.red.bold("\n[KONEKSI TERPUTUS]"), lastDisconnect?.error || 'Koneksi terputus.');
      if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
        connectToWhatsApp().catch(err => {
          console.error(chalk.red.bold("[ERROR RECONNECT]:"), err);
        });
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

connectToWhatsApp().catch((err) => {
  console.log(chalk.red("[FATAL START ERROR]"), err?.message || err);
});
