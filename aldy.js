
//﹌﹌﹌﹌﹌﹌﹌﹌﹌﹌﹌﹌//
//    </>  𝐂𝐫𝐞𝐝𝐢𝐭𝐬  </>      //
//      𝐂𝐫𝐞𝐚𝐭𝐨𝐫: 𝐀𝐋𝐃𝐘        //
//   𝐁𝐚𝐬𝐞: 𝐀𝐋𝐃𝐘 𝐁𝐚𝐢𝐥𝐞𝐲𝐬    //
//﹌﹌﹌﹌﹌﹌﹌﹌﹌﹌﹌﹌﹌//

require('./control/settings');
const fs = require('fs');
const sharp = require('sharp');
const axios = require('axios');
const util = require("util");
const { spawn, exec, execSync } = require('child_process');

const {
  default: baileys, proto, generateWAMessage, generateWAMessageFromContent, getContentType, prepareWAMessageMedia, downloadContentFromMessage
} = require("@whiskeysockets/baileys");

module.exports = sock = async (sock, m, chatUpdate, store) => {
  try {
    const rawBody = (
      m.mtype === "conversation" ? m.message?.conversation :
        m.mtype === "imageMessage" ? m.message?.imageMessage?.caption :
          m.mtype === "videoMessage" ? m.message?.videoMessage?.caption :
            m.mtype === "extendedTextMessage" ? m.message?.extendedTextMessage?.text :
              m.mtype === "buttonsResponseMessage" ? m.message?.buttonsResponseMessage?.selectedButtonId :
                m.mtype === "listResponseMessage" ? m.message?.listResponseMessage?.singleSelectReply?.selectedRowId :
                  m.mtype === "templateButtonReplyMessage" ? m.message?.templateButtonReplyMessage?.selectedId :
                    m.mtype === "interactiveResponseMessage" ? (() => { try { return JSON.parse(m.msg?.nativeFlowResponseMessage?.paramsJson || '{}').id; } catch(e) { return ''; } })() :
                      m.mtype === "messageContextInfo" ? m.message?.buttonsResponseMessage?.selectedButtonId || m.message?.listResponseMessage?.singleSelectReply?.selectedRowId || m.text : ""
    );
    const body = typeof rawBody === 'string' ? rawBody : (typeof m.text === 'string' ? m.text : '');

    const premium = JSON.parse(fs.readFileSync("./lib/database/premium.json"))
    const OWNER_PATH = "./lib/database/owner.json"
    const isPremium = premium.includes(m.sender);
    const sender = m.key.fromMe
      ? sock.user.id.split(":")[0] || sock.user.id
      : m.key.participant || m.key.remoteJid;
    const senderNumber = sender.split('@')[0];
    const budy = (typeof m.text === 'string' ? m.text : '');
    const prefa = ["#", "!", ".", ",", "@", "/"];
    const prefix = /^[¬∞zZ#$@+,.?=''():‚àö%¬¢¬£¬•‚Ç¨œÄ¬§ŒÝŒ¶&><‚Ñ¢¬©¬ÆŒî^Œ≤Œ±¬¶|/\\¬©^]/.test(body) ? body.match(/^[¬∞zZ#$@+,.?=''():‚àö%¬¢¬£¬•‚Ç¨œÄ¬§ŒÝŒ¶&><‚Ñ¢¬©¬ÆŒî^Œ≤Œ±¬¶|/\\¬©^]/gi) : '/';
    const from = m.key.remoteJid;
    const isGroup = from.endsWith("@g.us");
    const isChannel = from.endsWith("@newsletter");
    const botNumber = await sock.decodeJid(sock.user.id);
    const normalizeJid = jid => sock.decodeJid(String(jid || '')).replace(/:\d+(?=@)/, '');
    const jidUser = jid => normalizeJid(jid).split('@')[0].replace(/[^0-9]/g, '');
    const asUserJid = value => {
      const clean = normalizeJid(value);
      if (!clean) return '';
      if (clean.includes('@')) return clean;
      const number = clean.replace(/[^0-9]/g, '');
      return number ? number + '@s.whatsapp.net' : '';
    }
    const senderJid = normalizeJid(m.sender);
    const ownerbot = JSON.parse(fs.readFileSync(OWNER_PATH));
    const isOwner = ownerbot.includes(senderJid);
    const isCreator = [botNumber, ...(global.owner || [])].map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(senderJid);
    const bodyTrim = (body || '').trim();
    const prefixMatch = bodyTrim.match(/^[¬∞zZ#$@+,.?=''():‚àö%¬¢¬£¬•‚Ç¨œÄ¬§ŒÝŒ¶&><‚Ñ¢¬©¬ÆŒî^Œ≤Œ±¬¶|/\\¬©^]/);
    let command = '';
    let args = [];
    if (prefixMatch) {
      const prefixChar = prefixMatch[0];
      const withoutPrefix = bodyTrim.slice(prefixChar.length).trim();
      const parts = withoutPrefix.split(/ +/);
      command = parts.shift().toLowerCase() || '';
      args = parts;
    } else {
      const parts = bodyTrim.split(/ +/);
      command = parts.shift().toLowerCase() || '';
      args = parts;
    }
    const pushname = m.pushName || "no name";
    const text = q = args.join(" ");
    const quoted = m.quoted ? m.quoted : m;
    const mime = (quoted.msg || quoted).mimetype || '';
    const qmsg = (quoted.msg || quoted);
    const isMedia = /image|video|sticker|audio/.test(mime);
    const groupMetadata = isGroup ? await sock.groupMetadata(m.chat).catch((e) => { }) : "";
    const groupOwner = isGroup ? groupMetadata.owner : "";
    const groupName = m.isGroup ? groupMetadata.subject : "";
    const participants = isGroup ? await groupMetadata.participants : "";
    const groupAdmins = isGroup ? await participants.filter((v) => v.admin !== null).map((v) => v.id) : "";
    const groupMembers = isGroup ? groupMetadata.participants : "";
    const isGroupAdmins = isGroup ? groupAdmins.includes(m.sender) : false;
    const isBotGroupAdmins = isGroup ? groupAdmins.includes(botNumber) : false;
    const isBotAdmins = isGroup ? groupAdmins.includes(botNumber) : false;
    const isAdmins = isGroup ? groupAdmins.includes(m.sender) : false;

    const {
      smsg, formatSize, isUrl, generateMessageTag, getBuffer, getSizeMedia, runtime, fetchJson, sleep, processTime, getTime, tanggal, parseMention
    } = require('./lib/myfunc');

    const reply = (teks) => {
      return sock.sendMessage(m.chat, { text: teks }, { quoted: m });
    };

    // Mode Pribadi (Self) - Hanya bisa digunakan oleh nomor sendiri / owner
    if (sock.public !== false) {
      sock.public = false;
    }
    if (!sock.public && !m.key.fromMe && !isCreator) return;


    function formatSubs(count) {
      if (!count || count === 0) return '0';
      if (count >= 1_000_000) return (count / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
      if (count >= 1_000) return (count / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
      return String(count);
    }

    function formatDate(timestamp) {
      if (!timestamp) return '—';
      const d = new Date(typeof timestamp === 'number' && timestamp < 1e12 ? timestamp * 1000 : timestamp);
      const pad = n => String(n).padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    const date = tanggal(Date.now());

    // THUMBNAIL
    const thumbFile = fs.existsSync('./lib/media/thumb_aldy.jpg') ? './lib/media/thumb_aldy.jpg' : './lib/media/thumb.jpg';
    const thumb = await sharp(thumbFile)
      .resize(300, 300)
      .jpeg({ quality: 80 })
      .toBuffer()

    //======={ case button location }=======//
    switch (command) {
      case "menu": {
        const msg = `*Hai ${pushname}* 👋`

        const anu = `
╭───〔 *B O T  I N F O* 〕───
│ ⋄ *Creator* ☇ ALDY
│ ⋄ *Bot Name* ☇ ALDY Base
│ ⋄ *Baileys* ☇ aldy-baileys
│ ⋄ *Type* ☇ CommonJS
│ ⋄ *Status* ☇ ${isCreator ? "👑 Owner" : isPremium ? "💎 Premium" : "🫪 User Free"}
│ ⋄ *Mode* ☇ ${sock.public ? "🌐 Public" : "🔒 Self"}
│ ⋄ *Runtime* ☇ ${runtime(process.uptime())}
╰──────────────────────────`.trim();

        try {
          await sock.sendMessage(m.chat, {
            buttonsMessage: {
              locationMessage: {
                degreesLatitude: 0,
                degreesLongitude: 0,
                name: "ALDY Base",
                address: `📍${date}`,
                jpegThumbnail: thumb
              },
              contentText: msg,
              footerText: anu,
              buttons: [
                {
                  buttonId: "menu",
                  buttonText: {
                    displayText: "☰ menu"
                  },
                  nativeFlowInfo: {
                    name: "single_select",
                    paramsJson: JSON.stringify({
                      title: "Pilih Menu",
                      sections: [
                        {
                          title: "ALDY Base",
                          highlight_label: "🔥",
                          rows: [
                            {
                              header: "",
                              title: "📋 Menu Utama",
                              description: "Tampilkan informasi bot",
                              id: "/menu",
                            },
                            {
                              header: "",
                              title: "⚡ Kecepatan Bot",
                              description: "Cek respons kecepatan bot",
                              id: "/ping",
                            },
                            {
                              header: "",
                              title: "🚀 Space Rush (Game AI)",
                              description: "Mainkan mini-game interaktif Space Rush",
                              id: "/spacerush",
                            },
                            {
                              header: "",
                              title: "🎠 Carousel Message",
                              description: "Tampilkan menu kartu geser (Carousel)",
                              id: "/carousel",
                            },
                            {
                              header: "",
                              title: "🟩 Stiker Brat",
                              description: "Buat stiker gaya album Brat",
                              id: "/brat",
                            },
                            {
                              header: "",
                              title: "🎬 TikTok Downloader HD",
                              description: "Unduh video TikTok tanpa watermark",
                              id: "/sstiktok",
                            },
                            {
                              header: "",
                              title: "👁️ Read View Once (RVO)",
                              description: "Buka media sekali lihat",
                              id: "/rvo",
                            },
                            {
                              header: "",
                              title: "🌐 Get URL",
                              description: "Ambil data atau media dari tautan",
                              id: "/get",
                            }
                          ]
                        }
                      ]
                    })
                  },
                  type: 1
                },
                {
                  buttonId: "ping",
                  buttonText: {
                    displayText: "⚡ Ping"
                  },
                  type: 1
                }
              ],
              headerType: 6
            }
          }, { quoted: m });
        } catch (errMenu) {
          console.log("Error kirim menu button:", errMenu);
          reply(`${msg}\n\n${anu}`);
        }
      }
        break

      case "ping":
      case "speed":
      case "pinglive":
      case "serverinfo":
      case "monitor": {
        const os = require("os");
        const crypto = require("crypto");
        const axios = require("axios");

        try {
          let sync = "";
          if (fs.existsSync("./lib/ping.html")) {
            sync = fs.readFileSync("./lib/ping.html", "utf-8");
          } else {
            throw new Error("Template ./lib/ping.html tidak ditemukan");
          }

          // 1. Latency Nyata
          const latency = Date.now() - (Number(m.messageTimestamp) * 1000);

          // 2. Memory Node.js Process Nyata
          const heapUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
          const rssMem = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);

          // 3. RAM Fisik Sistem Nyata
          const totalMem = os.totalmem();
          const freeMem = os.freemem();
          const usedMem = totalMem - freeMem;
          const ramUsage = ((usedMem / totalMem) * 100).toFixed(1);
          const ramUsedGB = (usedMem / 1073741824).toFixed(1);
          const ramTotalGB = (totalMem / 1073741824).toFixed(1);

          // 4. Disk Storage Nyata
          let diskUsage = "0.0";
          let diskUsedGB = "0.0";
          let diskTotalGB = "0.0";
          try {
            if (fs.statfsSync) {
              const stat = fs.statfsSync(process.cwd());
              const dTotal = stat.blocks * stat.bsize;
              const dFree = stat.bfree * stat.bsize;
              const dUsed = dTotal - dFree;
              diskUsage = ((dUsed / dTotal) * 100).toFixed(1);
              diskUsedGB = (dUsed / 1073741824).toFixed(1);
              diskTotalGB = (dTotal / 1073741824).toFixed(1);
            }
          } catch (eStat) {}

          // 5. CPU Usage Nyata (Sampling 100ms)
          const getCpuUsage = () => new Promise((resolve) => {
            const start = os.cpus();
            setTimeout(() => {
              const end = os.cpus();
              let idleDiff = 0, totalDiff = 0;
              for (let i = 0; i < start.length; i++) {
                const sTimes = start[i].times;
                const eTimes = end[i].times;
                let sTotal = 0, eTotal = 0;
                for (const t in sTimes) sTotal += sTimes[t];
                for (const t in eTimes) eTotal += eTimes[t];
                idleDiff += (eTimes.idle - sTimes.idle);
                totalDiff += (eTotal - sTotal);
              }
              const usage = totalDiff > 0 ? ((1 - idleDiff / totalDiff) * 100).toFixed(1) : "0.0";
              resolve(Math.min(100, Math.max(0, parseFloat(usage))).toFixed(1));
            }, 100);
          });
          const cpuUsage = await getCpuUsage();

          // 6. IP Primer Nyata
          let ipPrimer = "127.0.0.1";
          try {
            const nets = os.networkInterfaces();
            for (const name of Object.keys(nets)) {
              for (const net of nets[name]) {
                if ((net.family === "IPv4" || net.family === 4) && !net.internal) {
                  ipPrimer = net.address;
                  break;
                }
              }
              if (ipPrimer !== "127.0.0.1") break;
            }
          } catch (eIp) {}

          const niki = sync
            .replace(/%LATENCY%/g, latency)
            .replace(/%PLATFORM%/g, os.platform())
            .replace(/%OS_INFO%/g, `${os.platform()} ${os.release()}`)
            .replace(/%ARCH_INFO%/g, os.arch())
            .replace(/%CPU_CORES%/g, os.cpus().length || 1)
            .replace(/%HEAP_USED%/g, heapUsed)
            .replace(/%RSS_MEM%/g, rssMem)
            .replace(/%NODE_INFO%/g, `Node ${process.version}`)
            .replace(/%BOTUPTIME%/g, process.uptime())
            .replace(/%SYSTEMUPTIME%/g, os.uptime())
            .replace(/%CPU_USAGE%/g, cpuUsage)
            .replace(/%RAM_USAGE%/g, ramUsage)
            .replace(/%RAM_USED_GB%/g, ramUsedGB)
            .replace(/%RAM_TOTAL_GB%/g, ramTotalGB)
            .replace(/%DISK_USAGE%/g, diskUsage)
            .replace(/%DISK_USED_GB%/g, diskUsedGB)
            .replace(/%DISK_TOTAL_GB%/g, diskTotalGB)
            .replace(/%IP_PRIMER%/g, ipPrimer)
            .replace(/© noxXza • 2026/g, '© ALDY • 2026')
            .replace(/noxXza/gi, 'ALDY')
            .replace(/noxleyss/gi, 'ALDY');

          const responseId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
          const responseData = {
            response_id: responseId,
            sections: [{
              view_model: {
                primitive: {
                  __typename: "GenAIaeacdsnwHtmlPrimitive",
                  payload: niki,
                  trusted_sources: []
                },
                __typename: "GenAISingleLayoutViewModel"
              }
            }]
          };

          const jsonString = JSON.stringify(responseData);
          const dataBase64 = Buffer.from(jsonString).toString('base64');

          await sock.relayMessage(m.chat, {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2,
              botMetadata: { messageDisclaimerText: "", botResponseId: responseId }
            },
            botForwardedMessage: {
              message: {
                richResponseMessage: {
                  messageType: 1,
                  submessages: [{ messageType: 2, messageText: "Server Monitor" }],
                  unifiedResponse: { data: dataBase64 },
                  contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedAiBotMessageInfo: { botJid: "867051314767696@bot" },
                    forwardOrigin: 4
                  }
                }
              }
            }
          }, { messageId: responseId });

        } catch (e) {
          reply(`❌ error di case ping: ${e.message}`);
        }
      }
        break

      //=============={ case Owner }==============//
      case "addowner":
      case "addown": {
        if (!isCreator) return reply(`*khusus owner!*`)
        if (!args[0]) return reply(`*example: ${prefix}addowner 628xxx*`)

        let ownerPath = "./lib/database/owner.json"
        let ownerbot = JSON.parse(fs.readFileSync(ownerPath))

        let target = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        let ceknya = await sock.onWhatsApp(target)
        if (ceknya.length == 0) return reply(`*Masukkan Nomor Yang Valid Dan Terdaftar Di WhatsApp!!!*`)

        if (ownerbot.includes(target)) return reply(`*${target} sudah jadi owner*`)

        ownerbot.push(target)
        fs.writeFileSync(ownerPath, JSON.stringify(ownerbot, null, 2))
        reply(`*✅ ${target} TELAH MENJADI OWNER*`)
      }
        break

      case "delowner":
      case "delown": {
        if (!isCreator) return reply(`*khusus owner!!*`)
        if (!args[0]) return reply(`*example: ${prefix}delowner 628xxx*`)

        let ownerPath = "./lib/database/owner.json"
        let ownerbot = JSON.parse(fs.readFileSync(ownerPath))

        let target = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        let unp = ownerbot.indexOf(target)
        if (unp === -1) return reply(`*${target} BUKAN OWNER*`)

        ownerbot.splice(unp, 1)
        fs.writeFileSync(ownerPath, JSON.stringify(ownerbot, null, 2))
        reply(`*✅ ${target} SUDAH BUKAN OWNER*`)
      }
        break

      case "addprem": {
        if (!isCreator) return reply("*❗ AKSES DI TOLAK!!*")
        if (!args[0]) return reply(`❌ BUKAN GITU \n*GINI CARA NYA ✅*\n example: ${prefix}addprem 628xxx`)

        let premPath = "./lib/database/premium.json"
        let premium = JSON.parse(fs.readFileSync(premPath))

        let target = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        let ceknya = await sock.onWhatsApp(target)
        if (ceknya.length == 0) return reply(`*Masukkan Nomor Yang Valid Dan Terdaftar Di WhatsApp!!!*`)

        if (premium.includes(target)) return reply(`*${target} sudah premium*`)

        premium.push(target)
        fs.writeFileSync(premPath, JSON.stringify(premium, null, 2))
        reply(`*✅ ${target} TELAH MENJADI PREMIUM*`)
      }
        break

      case "delprem": {
        if (!isCreator) return reply("*❗ AKSES DI TOLAK!!*")
        if (!args[0]) return reply(`❌ BUKAN GITU \n*GINI CARA NYA ✅*\n ${prefix}delprem 628xxx`)

        let premPath = "./lib/database/premium.json"
        let premium = JSON.parse(fs.readFileSync(premPath))

        let target = q.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        let unp = premium.indexOf(target)
        if (unp === -1) return reply(`*${target} BUKAN PREMIUM*`)

        premium.splice(unp, 1)
        fs.writeFileSync(premPath, JSON.stringify(premium, null, 2))
        reply(`*✅ ${target} SUDAH BUKAN PREMIUM*`)
      }
        break

      case 'public': {
        if (!isCreator) return reply("*Khusus Owner*");
        if (sock.public === true) return reply("Success To Public Mode");
        sock.public = true
        reply("Success To Public Mode");
      }
        break

      case 'self': {
        if (!isCreator) return reply("*Khusus Owner*");
        if (sock.public === false) return reply("Success To Self Mode");
        sock.public = false
        reply("Success To Self Mode");
      }
        break

      case "sc":
      case "script":
      case "getsc": {
        const sc = `
> *halo ${pushname}, apakah kamu ingin base script ini?*`

        const anu = `
jika kamu menginginkan base script ini silahkan klik tombol di bawah ini

\`rulles\`
- dilarang keras menghapus credits minimal taro di tqto
- dilarang memperjual belikan base ini karena 100% free
- boleh di jual dengan syarat sudah di tambah fitur
- dilarang mengklaim script ini 100%
`.trim()
        try {
          const media = await prepareWAMessageMedia(
            { image: thumb, mimetype: 'image/jpeg' },
            { upload: sock.waUploadToServer }
          );
          const interactiveMsg = {
            body: { text: sc },
            footer: { text: anu },
            header: {
              hasMediaAttachment: true,
              imageMessage: media.imageMessage
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "cta_url",
                  buttonParamsJson: JSON.stringify({
                    display_text: "get sc",
                    url: "https://github.com/aldy-bot",
                    merchant_url: "https://www.google.com"
                  })
                }
              ],
              messageParamsJson: "{}"
            }
          };

          const generatedMsg = generateWAMessageFromContent(from, {
            viewOnceMessage: {
              message: {
                messageContextInfo: {
                  deviceListMetadata: {},
                  deviceListMetadataVersion: 2
                },
                interactiveMessage: interactiveMsg
              }
            }
          }, { userJid: from, upload: sock.waUploadToServer });

          return await sock.relayMessage(from, generatedMsg.message, {
            messageId: generatedMsg.key.id
          });
        } catch (e) {
          console.log(e);
          reply(`❌ Gagal kirim pesan: ${e.message}`);
        }
      }
        break

      //=============={ Fitur RVO (Read View Once) }==============//
      case "rvo":
      case "readviewonce": {
        if (!m.quoted) return reply(`*Balas pesan sekali lihat (view-once) dengan ketik ${prefix}rvo*`);

        let qMsg = m.msg?.contextInfo?.quotedMessage;
        if (!qMsg) return reply(`*Tidak dapat menemukan pesan yang dibalas.*`);

        let viewOnce = qMsg.viewOnceMessageV2?.message ||
          qMsg.viewOnceMessage?.message ||
          qMsg.viewOnceMessageV2Extension?.message ||
          qMsg;

        let mediaType = viewOnce.imageMessage ? 'image' :
          viewOnce.videoMessage ? 'video' :
          viewOnce.audioMessage ? 'audio' : null;

        let mediaContent = viewOnce.imageMessage || viewOnce.videoMessage || viewOnce.audioMessage;

        if (!mediaType || !mediaContent) {
          return reply(`*Pesan yang Anda balas bukan pesan sekali lihat (view-once)!*`);
        }

        try {
          reply(`_Sedang mengambil media sekali lihat..._`);
          const stream = await downloadContentFromMessage(mediaContent, mediaType);
          let buffer = Buffer.from([]);
          for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
          }

          if (mediaType === 'image') {
            await sock.sendMessage(m.chat, {
              image: buffer,
              caption: mediaContent.caption ? `*Caption:* ${mediaContent.caption}` : undefined
            }, { quoted: m });
          } else if (mediaType === 'video') {
            await sock.sendMessage(m.chat, {
              video: buffer,
              caption: mediaContent.caption ? `*Caption:* ${mediaContent.caption}` : undefined,
              mimetype: mediaContent.mimetype || 'video/mp4'
            }, { quoted: m });
          } else if (mediaType === 'audio') {
            await sock.sendMessage(m.chat, {
              audio: buffer,
              mimetype: mediaContent.mimetype || 'audio/mp4',
              ptt: !!mediaContent.ptt
            }, { quoted: m });
          }
        } catch (err) {
          console.error(err);
          reply(`*Gagal membuka view-once:* ${err.message}`);
        }
      }
        break

      //=============={ Fitur GET (Fetch URL/Scrape) }==============//
      case "get":
      case "fetch": {
        if (!text) return reply(`*Masukkan URL yang ingin diambil!*\n*Contoh:* ${prefix}get https://api-anime-production-acc8.up.railway.app/tiktok`);
        if (!/^https?:\/\//i.test(text.trim())) return reply(`*URL harus diawali dengan http:// atau https://*`);

        try {
          reply(`_Mengambil data dari URL..._`);
          const res = await axios.get(text.trim(), {
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });

          const contentType = res.headers['content-type'] || '';

          if (/image/i.test(contentType)) {
            await sock.sendMessage(m.chat, { image: res.data, caption: text.trim() }, { quoted: m });
          } else if (/video/i.test(contentType)) {
            await sock.sendMessage(m.chat, { video: res.data, caption: text.trim(), mimetype: contentType }, { quoted: m });
          } else if (/audio/i.test(contentType)) {
            await sock.sendMessage(m.chat, { audio: res.data, mimetype: contentType }, { quoted: m });
          } else if (/json/i.test(contentType)) {
            try {
              const jsonStr = JSON.stringify(JSON.parse(res.data.toString()), null, 2);
              if (jsonStr.length > 5000) {
                await sock.sendMessage(m.chat, { document: Buffer.from(jsonStr), mimetype: 'application/json', fileName: 'response.json' }, { quoted: m });
              } else {
                reply(jsonStr);
              }
            } catch {
              reply(res.data.toString().slice(0, 4000));
            }
          } else {
            const textData = res.data.toString();
            if (textData.length > 5000) {
              await sock.sendMessage(m.chat, { document: Buffer.from(textData), mimetype: 'text/plain', fileName: 'result.txt' }, { quoted: m });
            } else {
              reply(textData);
            }
          }
        } catch (err) {
          console.error(err);
          reply(`*Gagal mengambil data:* ${err.response?.statusText || err.message}`);
        }
      }
        break

      //=============={ Fitur TikTok Downloader HD (Railway API ALDY) }==============//
      case "tiktok":
      case "tt":
      case "sstiktok":
      case "tiktokhd":
      case "tthd":
      case "tiktokmp3":
      case "ttmp3": {
        const urlInput = text ? text.trim() : (m.quoted?.text ? m.quoted.text.trim() : '');
        if (!urlInput || !/tiktok\.com/i.test(urlInput)) {
          return reply(`*Masukkan tautan/link TikTok yang valid!*\n*Contoh:* ${prefix}sstiktok https://vt.tiktok.com/ZS2Q1xYAB/`);
        }

        try {
          reply(`_Sedang memproses unduhan TikTok dari server ALDY..._`);
          const apiBase = 'https://api-anime-production-acc8.up.railway.app';
          
          let videoUrl = null;
          let audioUrl = null;
          let images = [];
          let author = '';
          let caption = '';
          let isHD = false;

          // 1. Telusuri API Railway /tiktok/all terlebih dahulu
          try {
            const allRes = await axios.get(`${apiBase}/tiktok/all`, {
              params: { url: urlInput },
              timeout: 15000
            });
            if (allRes.data && allRes.data.success && allRes.data.data) {
              const d = allRes.data.data;
              author = d.author || '';
              caption = d.caption || '';
              audioUrl = d.audio || null;
              if (Array.isArray(d.images) && d.images.length > 0) {
                images = d.images;
              } else if (Array.isArray(d.photos) && d.photos.length > 0) {
                images = d.photos;
              } else if (Array.isArray(d.slides) && d.slides.length > 0) {
                images = d.slides;
              }

              if (d.videoHD) {
                videoUrl = d.videoHD;
                isHD = true;
              } else if (d.video) {
                videoUrl = d.video;
              }
            }
          } catch (e) {
            // Lanjut jika /tiktok/all gagal
          }

          // 2. Jika belum mendapatkan video atau gambar, coba endpoint TikWM (ahli slide & video)
          if ((!videoUrl && images.length === 0) || command === 'tiktokhd' || command === 'tthd') {
            try {
              const twRes = await axios.get(`https://tikwm.com/api/?url=${encodeURIComponent(urlInput)}`, {
                timeout: 15000,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
              });
              if (twRes.data && twRes.data.data) {
                const tw = twRes.data.data;
                if (!author) author = tw.author?.nickname || tw.author?.unique_id || '';
                if (!caption) caption = tw.title || '';
                if (!audioUrl && tw.music) audioUrl = tw.music;

                if (Array.isArray(tw.images) && tw.images.length > 0) {
                  images = tw.images;
                } else if (tw.play && !videoUrl) {
                  videoUrl = tw.play;
                }
              }
            } catch (eTw) {}
          }

          // 3. Fallback endpoint spesifik /tiktok/download-hd jika masih belum ada video dan bukan gambar
          if (!videoUrl && images.length === 0) {
            try {
              const hdRes = await axios.get(`${apiBase}/tiktok/download-hd`, {
                params: { url: urlInput },
                timeout: 15000
              });
              if (hdRes.data && hdRes.data.success && hdRes.data.data?.downloadUrl) {
                videoUrl = hdRes.data.data.downloadUrl;
                isHD = hdRes.data.data.quality === 'hd';
                if (!author && hdRes.data.data.author) author = hdRes.data.data.author;
                if (!caption && hdRes.data.data.caption) caption = hdRes.data.data.caption;
              }
            } catch (e) {
              try {
                const stdRes = await axios.get(`${apiBase}/tiktok/download`, {
                  params: { url: urlInput },
                  timeout: 15000
                });
                if (stdRes.data && stdRes.data.success && stdRes.data.data?.downloadUrl) {
                  videoUrl = stdRes.data.data.downloadUrl;
                }
              } catch (errStd) {}
            }
          }

          // Jika user meminta MP3 audio (.tiktokmp3 / .ttmp3)
          if (command === 'tiktokmp3' || command === 'ttmp3') {
            if (!audioUrl) {
              try {
                const mp3Res = await axios.get(`${apiBase}/tiktok/download-mp3`, {
                  params: { url: urlInput },
                  timeout: 15000
                });
                if (mp3Res.data && mp3Res.data.success && mp3Res.data.data?.downloadUrl) {
                  audioUrl = mp3Res.data.data.downloadUrl;
                }
              } catch (e) {}
            }

            if (audioUrl) {
              await sock.sendMessage(m.chat, {
                audio: { url: audioUrl },
                mimetype: 'audio/mp4',
                fileName: 'tiktok_audio.mp3'
              }, { quoted: m });
              return;
            } else {
              return reply(`*Gagal mengunduh audio MP3 untuk TikTok ini.*`);
            }
          }

          // 4. JIKA TIKTOK MERUPAKAN SLIDE FOTO / GAMBAR -> MENGGUNAKAN CAROUSEL MESSAGE
          if (images.length > 0) {
            const { sendCarousel } = require('./lib/carousel');
            reply(`_Sedang menyusun ${images.length} foto ke dalam Carousel Message..._`);

            try {
              // Batasi kartu carousel maksimal 5 agar didukung penuh oleh semua versi WhatsApp
              const maxCards = Math.min(images.length, 5);
              const cards = [];

              for (let i = 0; i < maxCards; i++) {
                let imgBuffer = null;
                try {
                  const dl = await axios.get(images[i], {
                    responseType: 'arraybuffer',
                    timeout: 8000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                  });
                  imgBuffer = await sharp(dl.data)
                    .resize(600, 800, { fit: 'inside' })
                    .jpeg({ quality: 80 })
                    .toBuffer();
                } catch (eImg) {
                  imgBuffer = images[i];
                }

                cards.push({
                  title: `📷 Slide [${i + 1}/${images.length}]`,
                  body: caption ? `${caption.slice(0, 100)}${caption.length > 100 ? '...' : ''}` : `Foto TikTok ke-${i + 1} dari ${author || 'TikTok'}`,
                  footer: `Author: @${author || 'tiktok'}`,
                  image: imgBuffer,
                  buttons: [
                    { text: "🎵 Unduh Musik", id: `/tiktokmp3 ${urlInput}` }
                  ]
                });
              }

              const carouselHeaderBody = `
╭───〔 *TIKTOK CAROUSEL FOTO* 〕───
│ ⋄ *Author* ☇ ${author || 'TikTok User'}
│ ⋄ *Tipe* ☇ Slide Foto (Carousel)
│ ⋄ *Total Foto* ☇ ${images.length} gambar
│ ⋄ *Caption* ☇ ${caption || '-'}
╰──────────────────────────
_Geser kartu ke samping untuk melihat foto slide!_`.trim();

              await sendCarousel(sock, m.chat, {
                body: carouselHeaderBody,
                footer: "ALDY Base • TikTok Downloader",
                cards
              }, m);

              // Jika ada lebih dari 5 foto, kirimkan sisa fotonya secara langsung
              if (images.length > maxCards) {
                for (let i = maxCards; i < images.length; i++) {
                  try {
                    const dlRemain = await axios.get(images[i], {
                      responseType: 'arraybuffer',
                      timeout: 10000,
                      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                    });
                    const bufRemain = await sharp(dlRemain.data)
                      .resize(720, 960, { fit: 'inside' })
                      .jpeg({ quality: 85 })
                      .toBuffer();

                    await sock.sendMessage(m.chat, {
                      image: bufRemain,
                      caption: `📷 *Slide [${i + 1}/${images.length}]*`
                    }, { quoted: m });
                  } catch (eRemain) {
                    console.error(`Gagal kirim sisa foto ${i + 1}:`, eRemain);
                  }
                  await new Promise(r => setTimeout(r, 600));
                }
              }

              // Kirimkan juga audio lagu/soundtrack slide
              if (audioUrl) {
                await sock.sendMessage(m.chat, {
                  audio: { url: audioUrl },
                  mimetype: 'audio/mp4',
                  fileName: `${author || 'tiktok'}_slide_sound.mp3`
                }, { quoted: m });
              }

              return;

            } catch (errCarousel) {
              console.error("Gagal kirim via carousel, fallback ke kirim gambar langsung:", errCarousel);

              // Fallback kirim gambar satu per satu jika perangkat tidak mendukung carousel
              for (let i = 0; i < images.length; i++) {
                try {
                  const dlFb = await axios.get(images[i], {
                    responseType: 'arraybuffer',
                    timeout: 10000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                  });
                  const bufFb = await sharp(dlFb.data)
                    .resize(720, 960, { fit: 'inside' })
                    .jpeg({ quality: 85 })
                    .toBuffer();

                  await sock.sendMessage(m.chat, {
                    image: bufFb,
                    caption: `📷 *Slide [${i + 1}/${images.length}]*\n${caption ? `> ${caption}` : ''}`
                  }, { quoted: m });
                } catch (eFb) {
                  console.error(`Gagal kirim fallback slide ${i + 1}:`, eFb);
                }
                if (images.length > 1 && i < images.length - 1) {
                  await new Promise(r => setTimeout(r, 600));
                }
              }

              if (audioUrl) {
                try {
                  await sock.sendMessage(m.chat, {
                    audio: { url: audioUrl },
                    mimetype: 'audio/mp4',
                    fileName: 'tiktok_slide_sound.mp3'
                  }, { quoted: m });
                } catch (eAud) {}
              }

              return;
            }
          }

          // 5. JIKA TIKTOK MERUPAKAN VIDEO BIASA
          if (!videoUrl) {
            return reply(`*Gagal mendapatkan media TikTok. Pastikan postingan bersifat publik dan tautan valid.*`);
          }

          const infoText = `
╭───〔 *TIKTOK DOWNLOADER* 〕───
│ ⋄ *Author* ☇ ${author || 'TikTok User'}
│ ⋄ *Kualitas* ☇ ${isHD ? 'HD (High Definition)' : 'Standard (No WM)'}
│ ⋄ *Caption* ☇ ${caption || '-'}
│ ⋄ *Server* ☇ ALDY Railway API
╰──────────────────────────`.trim();

          await sock.sendMessage(m.chat, {
            video: { url: videoUrl },
            caption: infoText
          }, { quoted: m });

        } catch (err) {
          console.error(err);
          reply(`*Terjadi kesalahan saat memproses TikTok:* ${err.message}`);
        }
      }
        break

      //=============={ Fitur Stiker Brat (Sesuai Gambar / siputzx) }==============//
      case "brat":
      case "sbrat":
      case "bratgreen":
      case "stikerbrat": {
        let textBrat = text ? text : (m.quoted ? (m.quoted.text || m.quoted.caption || '') : '');
        if (!textBrat) return reply(`*Masukkan teks untuk stiker brat!*\n*Contoh:* ${prefix}brat Coba kalau lagi susah`);

        let isGreen = command === 'bratgreen' || /--green|-g/i.test(textBrat);
        textBrat = textBrat.replace(/--green|-g/gi, '').trim();

        try {
          reply(`_Sedang membuat stiker brat..._`);
          let stickerBuf = null;

          // 1. Prioritas Utama: API siputzx (hasil 100% persis seperti gambar contoh user)
          try {
            const res = await axios.get(`https://api.siputzx.my.id/api/m/brat?text=${encodeURIComponent(textBrat)}`, {
              responseType: 'arraybuffer',
              timeout: 10000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
            if (res.data && res.data.length > 1000) {
              stickerBuf = await sharp(res.data)
                .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
                .webp({ quality: 95 })
                .toBuffer();
            }
          } catch (e) {
            // Jika api siputzx offline/error, lanjut ke fallback
          }

          // 2. Fallback API cadangan (aqul-brat)
          if (!stickerBuf) {
            try {
              const res2 = await axios.get(`https://aqul-brat.hf.space/api/brat?text=${encodeURIComponent(textBrat)}`, {
                responseType: 'arraybuffer',
                timeout: 6000
              });
              if (res2.data && res2.data.length > 1000) {
                stickerBuf = await sharp(res2.data)
                  .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
                  .webp({ quality: 95 })
                  .toBuffer();
              }
            } catch (e) {}
          }

          // 3. Fallback Generator Lokal (SVG + Sharp: Rata Kiri Atas & Font Asli)
          if (!stickerBuf) {
            let lines = [];
            if (textBrat.includes('\n')) {
              lines = textBrat.split('\n').map(l => l.trim()).filter(Boolean);
            } else {
              const words = textBrat.split(/\s+/);
              let current = '';
              const maxChars = 11;
              for (const w of words) {
                if ((current + ' ' + w).trim().length > maxChars) {
                  if (current) lines.push(current.trim());
                  current = w;
                } else {
                  current += ' ' + w;
                }
              }
              if (current.trim()) lines.push(current.trim());
            }

            const fontSize = lines.length > 5 ? 52 : lines.length > 3 ? 65 : 80;
            const lineHeight = fontSize * 1.15;
            const startY = 75;

            const tspanLines = lines.map((line, i) =>
              `<tspan x="40" y="${startY + i * lineHeight}" text-anchor="start">${line}</tspan>`
            ).join('');

            const bgColor = isGreen ? '#8ACF00' : '#FFFFFF';

            const svg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="bratBlur">
                  <feGaussianBlur stdDeviation="0.8" />
                </filter>
              </defs>
              <rect width="512" height="512" fill="${bgColor}" />
              <g transform="scale(0.85, 1.2)">
                <text x="0" y="0" font-family="'Arial Narrow', 'Arial', sans-serif" font-size="${fontSize}px" font-weight="400" fill="#000000" filter="url(#bratBlur)">
                  ${tspanLines}
                </text>
              </g>
            </svg>`;

            stickerBuf = await sharp(Buffer.from(svg)).webp({ quality: 95 }).toBuffer();
          }

          await sock.sendMessage(m.chat, { sticker: stickerBuf }, { quoted: m });
        } catch (err) {
          console.error(err);
          reply(`*Gagal membuat stiker brat:* ${err.message}`);
        }
      }
        break

      //=============={ Fitur Game AI Space Rush }==============//
      case "spacerush":
      case "game":
      case "space":
      case "minigame": {
        const { sendSpaceRush } = require('./lib/spacerush');
        try {
          await sendSpaceRush(sock, m.chat, m);
        } catch (err) {
          console.error(err);
          reply(`*Gagal memuat Space Rush:* ${err.message}`);
        }
      }
        break

      //=============={ Fitur Carousel Message }==============//
      case "carousel":
      case "menucarousel":
      case "carousell": {
        const { sendCarousel } = require('./lib/carousel');
        try {
          reply(`_Sedang memuat Carousel Message..._`);
          const thumbPath = fs.existsSync('./lib/media/thumb_aldy.jpg') ? './lib/media/thumb_aldy.jpg' : './lib/media/thumb.jpg';

          const cards = [
            {
              title: "🤖 ALDY Bot Base",
              body: `Halo kak ${pushname}! 👋\nIni adalah contoh WhatsApp Carousel Card 1.\nBot multi-fungsi berbasis Baileys.`,
              footer: "ALDY Base • Card 1",
              image: thumbPath,
              buttons: [
                { text: "📋 Menu Utama", id: "/menu" },
                { text: "⚡ Cek Ping", id: "/ping" }
              ]
            },
            {
              title: "🚀 Mini Game AI",
              body: "Mainkan game interaktif Space Rush langsung di WhatsApp dengan kontrol tombol kiri dan kanan!",
              footer: "ALDY Base • Card 2",
              image: thumbPath,
              buttons: [
                { text: "🎮 Main Space Rush", id: "/spacerush" }
              ]
            },
            {
              title: "🟩 Stiker Brat & Media",
              body: "Buat stiker Brat kekinian atau download video TikTok kualitas HD tanpa watermark.",
              footer: "ALDY Base • Card 3",
              image: thumbPath,
              buttons: [
                { text: "🟩 Stiker Brat", id: "/brat ALDY BOT" },
                { text: "🎬 TikTok HD", id: "/sstiktok" }
              ]
            }
          ];

          await sendCarousel(sock, m.chat, {
            body: `🎠 *WhatsApp Carousel Message*\nGeser kartu ke samping untuk melihat menu lainnya!`,
            footer: "Powered by ALDY Base",
            cards
          }, m);
        } catch (err) {
          console.error("Error Carousel:", err);
          reply(`*Gagal mengirim Carousel Message:* ${err.message}`);
        }
      }
        break

      default:
        if (budy.startsWith('=>')) {
          if (!isCreator) return reply("*khusus owner*");
          try {
            let evaled = await eval(budy.slice(2));
            if (typeof evaled !== 'string') evaled = require('util').inspect(evaled);
            reply(evaled);
          } catch (err) {
            reply(String(err));
          }
        }

        if (budy.startsWith('$')) {
          if (!isCreator) return reply("*khusus owner*");
          exec(q, (err, stdout) => {
            if (err) return reply(err)
            if (stdout) return reply(stdout)
          })
        }
    }
  } catch (err) {
    console.log(require("util").format(err));
  }
};

let file = require.resolve(__filename);
require('fs').watchFile(file, () => {
  require('fs').unwatchFile(file);
  console.log('\x1b[0;32m' + __filename + ' \x1b[1;32mupdated!\x1b[0m');
  delete require.cache[file];
  require(file);
});
