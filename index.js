// 請將此檔案命名為 index.js 並搭配 .env 使用
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const IQ_BIBLE_API_KEY = process.env.IQ_BIBLE_API_KEY;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`機器人已上線：${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = message.content.trim();

    if (content === '!testapi') {
        try {
            const response = await axios.get('https://vibrantmiami-iq-bible-v1.p.rapidapi.com/GetVerse', {
                params: {
                    verseId: 'Genesis1:1',
                    versionId: 'kjv'
                },
                headers: {
                    'X-RapidAPI-Key': IQ_BIBLE_API_KEY,
                    'X-RapidAPI-Host': 'vibrantmiami-iq-bible-v1.p.rapidapi.com'
                }
            });

            console.log('✅ 測試成功:', response.data);
            await message.reply(`✅ 測試成功，內容如下：\n${JSON.stringify(response.data).slice(0, 500)}...`);

        } catch (err) {
            console.error('❌ 測試失敗:', err.response?.data || err.message);
            await message.reply(`❌ 測試失敗：${err.response?.data?.message || err.message}`);
        }

        return;
    }

    if (content.match(/^([\u4e00-\u9fa5]+)(\d+):(\d+)$/)) {
        const match = content.match(/^([\u4e00-\u9fa5]+)(\d+):(\d+)$/);
        const zhBook = match[1];
        const chapter = match[2];
        const verse = match[3];

        const bookMap = {
            '創': 'Genesis', '出': 'Exodus', '利': 'Leviticus', '民': 'Numbers', '申': 'Deuteronomy',
            '太': 'Matthew', '可': 'Mark', '路': 'Luke', '約': 'John', '徒': 'Acts',
            '羅': 'Romans', '林前': '1Corinthians', '林後': '2Corinthians', '啟': 'Revelation'
        };

        const book = bookMap[zhBook];
        if (!book) {
            await message.reply('❌ 書卷縮寫無法辨識。');
            return;
        }

        try {
            const response = await axios.get('https://vibrantmiami-iq-bible-v1.p.rapidapi.com/GetVerse', {
                params: {
                    verseId: `${book}${chapter}:${verse}`,
                    versionId: 'kjv'
                },
                headers: {
                    'X-RapidAPI-Key': IQ_BIBLE_API_KEY,
                    'X-RapidAPI-Host': 'vibrantmiami-iq-bible-v1.p.rapidapi.com'
                }
            });

            const verseText = response.data.text || response.data.verseText || '找不到經文內容';

            const reply = `📖 **${zhBook}${chapter}:${verse}**\n${verseText}`;
            await message.reply(reply);

        } catch (error) {
            console.error('API 錯誤:', error.response?.data || error.message);
            await message.reply('❌ 查詢失敗，請稍後再試');
        }
    }
});

client.login(DISCORD_TOKEN);
