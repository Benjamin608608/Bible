const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const IQ_BIBLE_API_KEY = process.env.IQ_BIBLE_API_KEY;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

const SUPERSCRIPT_NUMBERS = {
  '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵',
  '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '0': '⁰'
};

function toSuperscript(number) {
  return number.toString().split('').map(d => SUPERSCRIPT_NUMBERS[d] || d).join('');
}

// 中文簡寫對應英文全名
const BIBLE_BOOKS = {
  '創': 'Genesis', '出': 'Exodus', '利': 'Leviticus', '民': 'Numbers', '申': 'Deuteronomy',
  '書': 'Joshua', '士': 'Judges', '得': 'Ruth', '撒上': '1Samuel', '撒下': '2Samuel',
  '王上': '1Kings', '王下': '2Kings', '代上': '1Chronicles', '代下': '2Chronicles',
  '拉': 'Ezra', '尼': 'Nehemiah', '斯': 'Esther', '伯': 'Job', '詩': 'Psalms',
  '箴': 'Proverbs', '傳': 'Ecclesiastes', '歌': 'SongofSongs', '賽': 'Isaiah', '耶': 'Jeremiah',
  '哀': 'Lamentations', '結': 'Ezekiel', '但': 'Daniel', '何': 'Hosea', '珥': 'Joel',
  '摩': 'Amos', '俄': 'Obadiah', '拿': 'Jonah', '彌': 'Micah', '鴻': 'Nahum',
  '哈': 'Habakkuk', '番': 'Zephaniah', '該': 'Haggai', '亞': 'Zechariah', '瑪': 'Malachi',
  '太': 'Matthew', '可': 'Mark', '路': 'Luke', '約': 'John', '徒': 'Acts',
  '羅': 'Romans', '林前': '1Corinthians', '林後': '2Corinthians', '加': 'Galatians', '弗': 'Ephesians',
  '腓': 'Philippians', '西': 'Colossians', '帖前': '1Thessalonians', '帖後': '2Thessalonians',
  '提前': '1Timothy', '提後': '2Timothy', '多': 'Titus', '門': 'Philemon', '來': 'Hebrews',
  '雅': 'James', '彼前': '1Peter', '彼後': '2Peter', '約一': '1John', '約二': '2John',
  '約三': '3John', '猶': 'Jude', '啟': 'Revelation'
};

// 書卷英文名 → IQ Bible 的 ID（1–66）
const BOOK_IDS = {
  Genesis: 1, Exodus: 2, Leviticus: 3, Numbers: 4, Deuteronomy: 5,
  Joshua: 6, Judges: 7, Ruth: 8, '1Samuel': 9, '2Samuel': 10,
  '1Kings': 11, '2Kings': 12, '1Chronicles': 13, '2Chronicles': 14,
  Ezra: 15, Nehemiah: 16, Esther: 17, Job: 18, Psalms: 19,
  Proverbs: 20, Ecclesiastes: 21, SongofSongs: 22, Isaiah: 23, Jeremiah: 24,
  Lamentations: 25, Ezekiel: 26, Daniel: 27, Hosea: 28, Joel: 29,
  Amos: 30, Obadiah: 31, Jonah: 32, Micah: 33, Nahum: 34,
  Habakkuk: 35, Zephaniah: 36, Haggai: 37, Zechariah: 38, Malachi: 39,
  Matthew: 40, Mark: 41, Luke: 42, John: 43, Acts: 44, Romans: 45,
  '1Corinthians': 46, '2Corinthians': 47, Galatians: 48, Ephesians: 49, Philippians: 50,
  Colossians: 51, '1Thessalonians': 52, '2Thessalonians': 53, '1Timothy': 54, '2Timothy': 55,
  Titus: 56, Philemon: 57, Hebrews: 58, James: 59, '1Peter': 60,
  '2Peter': 61, '1John': 62, '2John': 63, '3John': 64, Jude: 65, Revelation: 66
};

function parseReference(input) {
  const match = input.match(/^(.+?)(\d+):(\d+)$/);
  if (!match) return null;

  const key = match[1].trim();
  const chapter = parseInt(match[2]);
  const verse = parseInt(match[3]);
  const book = BIBLE_BOOKS[key];

  if (!book) return null;

  return { book, chapter, verse };
}

async function getBibleVerse(book, chapter, verse) {
  const bookId = BOOK_IDS[book];
  if (!bookId) return null;

  const verseId = `${bookId}${String(chapter).padStart(3, '0')}${String(verse).padStart(3, '0')}`;

  try {
    const res = await axios.get('https://iq-bible.p.rapidapi.com/GetWords', {
      params: { verseId },
      headers: {
        'X-RapidAPI-Host': 'iq-bible.p.rapidapi.com',
        'X-RapidAPI-Key': IQ_BIBLE_API_KEY,
      }
    });

    return res.data;
  } catch (err) {
    console.error('❌ API錯誤:', err.message);
    if (err.response) {
      console.error('🔍 狀態碼:', err.response.status);
      console.error('📦 回應內容:', err.response.data);
    }
    return null;
  }
}

function addStrongsToText(text, strongsNumbers) {
  if (!strongsNumbers || strongsNumbers.length === 0) return text;

  let modifiedText = text;

  strongsNumbers.forEach((strong) => {
    if (strong.word && strong.word.trim()) {
      const cleanWord = strong.word.replace(/[^\w\s]/g, '');
      if (!cleanWord) return;

      const strongsSup = toSuperscript(
        strong.strongsNumber?.replace(/[^\d]/g, '') || ''
      );

      const escaped = cleanWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');

      if (regex.test(modifiedText)) {
        modifiedText = modifiedText.replace(regex, `${cleanWord}${strongsSup}`);
      }
    }
  });

  return modifiedText;
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const ref = parseReference(message.content);
  if (!ref) return;

  const data = await getBibleVerse(ref.book, ref.chapter, ref.verse);
  if (!data) {
    message.reply('查詢失敗，請稍後再試。');
    return;
  }

  const text = data.map(item => item.word || '').join(' ');
  const enriched = addStrongsToText(text, data);

  message.reply(`${ref.book} ${ref.chapter}:${ref.verse}\n${enriched}`);
});

client.once('ready', () => {
  console.log(`✅ 已登入：${client.user.tag}`);
});

client.login(DISCORD_TOKEN);
