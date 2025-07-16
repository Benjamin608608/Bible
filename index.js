const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const IQ_BIBLE_API_KEY = process.env.IQ_BIBLE_API_KEY || '你的IQ Bible API金鑰';

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

const BIBLE_BOOKS = {
  '創': 'Genesis', '出': 'Exodus', '利': 'Leviticus', '民': 'Numbers', '申': 'Deuteronomy',
  '太': 'Matthew', '可': 'Mark', '路': 'Luke', '約': 'John', '徒': 'Acts',
  '羅': 'Romans', '林前': '1Corinthians', '林後': '2Corinthians',
  '加': 'Galatians', '弗': 'Ephesians', '腓': 'Philippians', '西': 'Colossians',
  '帖前': '1Thessalonians', '帖後': '2Thessalonians', '提前': '1Timothy', '提後': '2Timothy',
  '多': 'Titus', '門': 'Philemon', '來': 'Hebrews', '雅': 'James',
  '彼前': '1Peter', '彼後': '2Peter', '約一': '1John', '約二': '2John', '約三': '3John',
  '猶': 'Jude', '啟': 'Revelation'
};

function parseReference(input) {
  const match = input.match(/^(.+?)(\d+):(\d+)$/);
  if (!match) return null;

  const bookKey = match[1].trim();
  const chapter = parseInt(match[2]);
  const verse = parseInt(match[3]);
  const book = BIBLE_BOOKS[bookKey];

  if (!book) return null;

  return { book, chapter, verse };
}

async function getBibleVerse(book, chapter, verse) {
  const bookIds = {
    Genesis: 1, Exodus: 2, Leviticus: 3, Numbers: 4, Deuteronomy: 5,
    Matthew: 40, Mark: 41, Luke: 42, John: 43, Acts: 44, Romans: 45,
  };

  const bookId = bookIds[book] || 1;
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
    console.error('API錯誤:', err.message);
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
        modifiedText = modifiedText.replace(
          regex,
          `${cleanWord}${strongsSup}`
        );
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

  message.reply(`${ref.book} ${ref.chapter}:${ref.verse}：\n${enriched}`);
});

client.once('ready', () => {
  console.log(`✅ 已登入：${client.user.tag}`);
});

client.login(DISCORD_TOKEN);
