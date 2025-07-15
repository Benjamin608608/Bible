const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');

// 環境變數設定
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const IQ_BIBLE_API_KEY = process.env.IQ_BIBLE_API_KEY || '9756948e1amsh82f1bcb3b5a1802p1628fajsneeb7e8e02c62';

// 創建Discord客戶端
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// 數字表情符號映射
const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
const EXTENDED_EMOJIS = ['🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮', '🇯', '🇰', '🇱', '🇲', '🇳', '🇴', '🇵', '🇶', '🇷', '🇸', '🇹'];

// Unicode上標數字映射
const SUPERSCRIPT_NUMBERS = {
    '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵',
    '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '0': '⁰'
};

// 將數字轉換為上標
function toSuperscript(number) {
    return number.toString().split('').map(digit => SUPERSCRIPT_NUMBERS[digit] || digit).join('');
}

// 儲存訊息的Strong's number映射
const messageStrongsMap = new Map();

// 聖經書卷對應表（中文 -> 英文）
const BIBLE_BOOKS = {
    // 舊約
    '創世記': 'Genesis', '創': 'Genesis',
    '出埃及記': 'Exodus', '出': 'Exodus',
    '利未記': 'Leviticus', '利': 'Leviticus',
    '民數記': 'Numbers', '民': 'Numbers',
    '申命記': 'Deuteronomy', '申': 'Deuteronomy',
    '約書亞記': 'Joshua', '書': 'Joshua',
    '士師記': 'Judges', '士': 'Judges',
    '路得記': 'Ruth', '得': 'Ruth',
    '撒母耳記上': '1Samuel', '撒上': '1Samuel',
    '撒母耳記下': '2Samuel', '撒下': '2Samuel',
    '列王紀上': '1Kings', '王上': '1Kings',
    '列王紀下': '2Kings', '王下': '2Kings',
    '歷代志上': '1Chronicles', '代上': '1Chronicles',
    '歷代志下': '2Chronicles', '代下': '2Chronicles',
    '以斯拉記': 'Ezra', '拉': 'Ezra',
    '尼希米記': 'Nehemiah', '尼': 'Nehemiah',
    '以斯帖記': 'Esther', '斯': 'Esther',
    '約伯記': 'Job', '伯': 'Job',
    '詩篇': 'Psalms', '詩': 'Psalms',
    '箴言': 'Proverbs', '箴': 'Proverbs',
    '傳道書': 'Ecclesiastes', '傳': 'Ecclesiastes',
    '雅歌': 'SongofSongs', '歌': 'SongofSongs',
    '以賽亞書': 'Isaiah', '賽': 'Isaiah',
    '耶利米書': 'Jeremiah', '耶': 'Jeremiah',
    '耶利米哀歌': 'Lamentations', '哀': 'Lamentations',
    '以西結書': 'Ezekiel', '結': 'Ezekiel',
    '但以理書': 'Daniel', '但': 'Daniel',
    '何西阿書': 'Hosea', '何': 'Hosea',
    '約珥書': 'Joel', '珥': 'Joel',
    '阿摩司書': 'Amos', '摩': 'Amos',
    '俄巴底亞書': 'Obadiah', '俄': 'Obadiah',
    '約拿書': 'Jonah', '拿': 'Jonah',
    '彌迦書': 'Micah', '彌': 'Micah',
    '那鴻書': 'Nahum', '鴻': 'Nahum',
    '哈巴谷書': 'Habakkuk', '哈': 'Habakkuk',
    '西番雅書': 'Zephaniah', '番': 'Zephaniah',
    '哈該書': 'Haggai', '該': 'Haggai',
    '撒迦利亞書': 'Zechariah', '亞': 'Zechariah',
    '瑪拉基書': 'Malachi', '瑪': 'Malachi',
    
    // 新約
    '馬太福音': 'Matthew', '太': 'Matthew',
    '馬可福音': 'Mark', '可': 'Mark',
    '路加福音': 'Luke', '路': 'Luke',
    '約翰福音': 'John', '約': 'John',
    '使徒行傳': 'Acts', '徒': 'Acts',
    '羅馬書': 'Romans', '羅': 'Romans',
    '哥林多前書': '1Corinthians', '林前': '1Corinthians',
    '哥林多後書': '2Corinthians', '林後': '2Corinthians',
    '加拉太書': 'Galatians', '加': 'Galatians',
    '以弗所書': 'Ephesians', '弗': 'Ephesians',
    '腓立比書': 'Philippians', '腓': 'Philippians',
    '歌羅西書': 'Colossians', '西': 'Colossians',
    '帖撒羅尼迦前書': '1Thessalonians', '帖前': '1Thessalonians',
    '帖撒羅尼迦後書': '2Thessalonians', '帖後': '2Thessalonians',
    '提摩太前書': '1Timothy', '提前': '1Timothy',
    '提摩太後書': '2Timothy', '提後': '2Timothy',
    '提多書': 'Titus', '多': 'Titus',
    '腓利門書': 'Philemon', '門': 'Philemon',
    '希伯來書': 'Hebrews', '來': 'Hebrews',
    '雅各書': 'James', '雅': 'James',
    '彼得前書': '1Peter', '彼前': '1Peter',
    '彼得後書': '2Peter', '彼後': '2Peter',
    '約翰一書': '1John', '約一': '1John',
    '約翰二書': '2John', '約二': '2John',
    '約翰三書': '3John', '約三': '3John',
    '猶大書': 'Jude', '猶': 'Jude',
    '啟示錄': 'Revelation', '啟': 'Revelation'
};

// 解析經文引用格式
function parseReference(input) {
    const cleanInput = input.replace(/\s/g, '');
    
    const patterns = [
        /^(.+?)(\d+):(\d+)$/,
        /^(.+?)(\d+)第(\d+)節$/,
        /^(.+?)(\d+)章$/,
        /^(.+?)(\d+)$/
    ];
    
    for (const pattern of patterns) {
        const match = cleanInput.match(pattern);
        if (match) {
            const bookName = match[1];
            const chapter = parseInt(match[2]);
            const verse = match[3] ? parseInt(match[3]) : null;
            
            const englishBook = BIBLE_BOOKS[bookName];
            if (englishBook) {
                return {
                    book: englishBook,
                    bookName: bookName,
                    chapter: chapter,
                    verse: verse
                };
            }
        }
    }
    
    return null;
}

// 從IQ Bible API獲取經文和Strong's numbers
async function getBibleVerse(bookName, chapter, verse = null) {
    try {
        console.log('請求IQ Bible API:', { book: bookName, chapter, verse });
        
        // 嘗試不同的API端點，基於文檔中提到的端點
        const endpoints = [
            {
                name: 'GetChapterByBookAndChapterId',
                url: 'https://iq-bible.p.rapidapi.com/GetChapterByBookAndChapterId',
                params: {
                    bookAndChapterId: `${bookName}.${chapter}`,
                    versionId: 'kjv' // 或其他版本
                }
            },
            {
                name: 'GetVerse', 
                url: 'https://iq-bible.p.rapidapi.com/GetVerse',
                params: verse ? {
                    book: bookName,
                    chapter: chapter.toString(),
                    verse: verse.toString(),
                    version: 'kjv'
                } : {
                    book: bookName,
                    chapter: chapter.toString(),
                    version: 'kjv'
                }
            },
            {
                name: 'GetChapter',
                url: 'https://iq-bible.p.rapidapi.com/GetChapter', 
                params: {
                    book: bookName,
                    chapter: chapter.toString(),
                    version: 'kjv'
                }
            }
        ];
        
        // 如果只查詢特定經節，優先使用單節API
        const endpointsToTry = verse ? endpoints : [endpoints[0], endpoints[2]];
        
        for (const endpoint of endpointsToTry) {
            try {
                console.log(`嘗試端點: ${endpoint.name}`, endpoint.params);
                
                const response = await axios.get(endpoint.url, {
                    params: endpoint.params,
                    timeout: 15000,
                    headers: {
                        'X-RapidAPI-Host': 'iq-bible.p.rapidapi.com',
                        'X-RapidAPI-Key': IQ_BIBLE_API_KEY,
                        'Accept': 'application/json'
                    }
                });
                
                console.log(`${endpoint.name} 回應狀態:`, response.status);
                console.log(`${endpoint.name} 回應內容:`, JSON.stringify(response.data, null, 2));
                
                if (response.data && response.status === 200) {
                    return {
                        data: response.data,
                        endpoint: endpoint.name
                    };
                }
            } catch (endpointError) {
                console.log(`${endpoint.name} 失敗:`, endpointError.response?.status, endpointError.message);
                continue;
            }
        }
        
        throw new Error('所有API端點都無法正常回應');
        
    } catch (error) {
        console.error('獲取經文時發生錯誤:', error.message);
        if (error.response) {
            console.error('錯誤詳情:', error.response.status, error.response.data);
        }
        throw error;
    }
}

// 從IQ Bible API獲取Strong's number詳細資料
async function getStrongsData(strongNumber) {
    try {
        console.log('查詢Strong\'s number:', strongNumber);
        
        // 標準化Strong's編號格式
        let cleanNumber = strongNumber.replace(/^[A-Z]*/, '');
        const isHebrew = strongNumber.startsWith('H') || strongNumber.includes('Hebrew');
        const standardNumber = (isHebrew ? 'H' : 'G') + cleanNumber;
        
        console.log(`標準化編號: ${strongNumber} -> ${standardNumber}`);
        
        // 嘗試不同的IQ Bible API端點
        const endpoints = [
            {
                url: 'https://iq-bible.p.rapidapi.com/GetStrongsDefinition',
                params: { strongsNumber: standardNumber }
            },
            {
                url: 'https://iq-bible.p.rapidapi.com/GetWordDefinition',
                params: { word: standardNumber }
            },
            {
                url: 'https://iq-bible.p.rapidapi.com/GetStrongsData',
                params: { strong: standardNumber }
            }
        ];
        
        for (const endpoint of endpoints) {
            try {
                console.log(`嘗試端點: ${endpoint.url}`, endpoint.params);
                
                const response = await axios.get(endpoint.url, {
                    params: endpoint.params,
                    timeout: 10000,
                    headers: {
                        'X-RapidAPI-Host': 'iq-bible.p.rapidapi.com',
                        'X-RapidAPI-Key': IQ_BIBLE_API_KEY,
                        'Accept': 'application/json'
                    }
                });
                
                console.log(`${endpoint.url} 回應:`, JSON.stringify(response.data, null, 2));
                
                if (response.data && (response.data.definition || response.data.meaning || response.data.word)) {
                    return response.data;
                }
            } catch (error) {
                console.log(`${endpoint.url} 失敗:`, error.message);
                continue;
            }
        }
        
        console.log('所有Strong\'s API端點都未返回有效資料');
        return null;
    } catch (error) {
        console.error('獲取Strong\'s資料時發生錯誤:', error.message);
        throw error;
    }
}

// 處理IQ Bible API的回應，解析經文和Strong's numbers
function parseIQBibleResponse(apiResponse, bookName, chapter, verse) {
    try {
        console.log('開始解析IQ Bible回應...');
        console.log('API端點:', apiResponse.endpoint);
        console.log('回應數據類型:', typeof apiResponse.data);
        
        const data = apiResponse.data;
        
        if (!data) {
            console.log('API回應為空');
            return null;
        }
        
        let verseText = '';
        let strongsNumbers = [];
        
        // 根據不同的API端點解析不同的數據格式
        switch (apiResponse.endpoint) {
            case 'GetChapterByBookAndChapterId':
                // 處理章節API的回應
                if (data.chapter && data.chapter.verses) {
                    if (verse) {
                        // 查找特定經節
                        const targetVerse = data.chapter.verses.find(v => v.verseNumber == verse);
                        if (targetVerse) {
                            verseText = targetVerse.text || targetVerse.verseText || '';
                        }
                    } else {
                        // 返回整章
                        verseText = data.chapter.verses.map(v => 
                            `${v.verseNumber}. ${v.text || v.verseText || ''}`
                        ).join(' ');
                    }
                }
                break;
                
            case 'GetVerse':
                // 處理單節API的回應
                if (data.text || data.verseText) {
                    verseText = data.text || data.verseText;
                } else if (data.verse) {
                    verseText = data.verse.text || data.verse.verseText || '';
                }
                break;
                
            case 'GetChapter':
                // 處理章節API的回應
                if (Array.isArray(data)) {
                    if (verse) {
                        const targetVerse = data.find(v => v.verse == verse || v.verseNumber == verse);
                        if (targetVerse) {
                            verseText = targetVerse.text || targetVerse.verseText || '';
                        }
                    } else {
                        verseText = data.map(v => 
                            `${v.verse || v.verseNumber}. ${v.text || v.verseText || ''}`
                        ).join(' ');
                    }
                } else if (data.verses) {
                    // 處理有verses屬性的情況
                    if (verse) {
                        const targetVerse = data.verses.find(v => v.verse == verse || v.verseNumber == verse);
                        if (targetVerse) {
                            verseText = targetVerse.text || targetVerse.verseText || '';
                        }
                    } else {
                        verseText = data.verses.map(v => 
                            `${v.verse || v.verseNumber}. ${v.text || v.verseText || ''}`
                        ).join(' ');
                    }
                }
                break;
                
            default:
                // 嘗試通用解析
                if (data.text) {
                    verseText = data.text;
                } else if (data.verseText) {
                    verseText = data.verseText;
                } else if (typeof data === 'string') {
                    verseText = data;
                } else {
                    verseText = '無法解析的經文格式';
                }
        }
        
        // 清理經文文本
        verseText = verseText.trim();
        
        // 限制長度以避免Discord限制
        if (verseText.length > 1500) {
            console.log('經文文本過長，進行截斷:', verseText.length);
            verseText = verseText.slice(0, 1500) + '...';
        }
        
        console.log('解析出的經文文本:', verseText);
        console.log('經文文本長度:', verseText.length);
        
        return {
            record: [{
                book: bookName,
                chapter: chapter,
                verse: verse,
                text: verseText
            }],
            strongs: strongsNumbers // 暫時留空，專注於經文顯示
        };
    } catch (error) {
        console.error('解析IQ Bible回應時發生錯誤:', error);
        
        return {
            record: [{
                book: bookName,
                chapter: chapter,  
                verse: verse,
                text: '解析失敗，請稍後再試'
            }],
            strongs: []
        };
    }
}

// 處理聖經查詢
async function handleBibleQuery(message, reference) {
    try {
        const parsed = parseReference(reference);
        if (!parsed) {
            await message.reply('❌ 無法解析經文引用格式。請使用如：太1:1、馬太福音1:1、詩23 等格式。');
            return;
        }
        
        console.log('解析結果:', parsed);
        
        const data = await getBibleVerse(parsed.book, parsed.chapter, parsed.verse);
        const formatted = parseIQBibleResponse(data, parsed.bookName, parsed.chapter, parsed.verse);
        
        if (!formatted || !formatted.record || formatted.record.length === 0) {
            await message.reply('❌ 找不到指定的經文，請檢查書卷名稱和章節是否正確。');
            return;
        }
        
        const record = formatted.record[0];
        let responseText = `**${record.book} ${record.chapter}${record.verse ? ':' + record.verse : ''}** ${record.text}`;
        
        // 確保訊息長度不超過Discord限制
        if (responseText.length > 1800) {
            responseText = responseText.slice(0, 1800) + '...\n\n*(經文內容過長，已截斷)*';
        }
        
        const sentMessage = await message.reply(responseText);
        console.log('訊息已發送，ID:', sentMessage.id);
        
        // 如果有Strong's number，添加表情符號反應並儲存映射
        if (formatted.strongs && formatted.strongs.length > 0) {
            console.log('開始添加表情符號反應...');
            messageStrongsMap.set(sentMessage.id, formatted.strongs);
            
            // 限制表情符號數量，避免過多
            const maxEmojis = Math.min(formatted.strongs.length, 20);
            
            for (let i = 0; i < maxEmojis; i++) {
                const strong = formatted.strongs[i];
                try {
                    console.log(`添加表情符號: ${strong.emoji} for ${strong.number}`);
                    await sentMessage.react(strong.emoji);
                } catch (error) {
                    console.error(`添加表情符號 ${strong.emoji} 失敗:`, error);
                }
            }
            
            console.log('所有表情符號添加完成');
            
            setTimeout(() => {
                messageStrongsMap.delete(sentMessage.id);
                console.log(`清理訊息 ${sentMessage.id} 的映射`);
            }, 300000);
        }
        
    } catch (error) {
        console.error('處理聖經查詢時發生錯誤:', error);
        
        // 根據不同錯誤類型提供不同的回應
        let errorMessage = '❌ 查詢經文時發生錯誤';
        
        if (error.message.includes('4000 or fewer in length')) {
            errorMessage = '❌ 查詢結果過長，正在優化顯示格式，請稍後再試';
        } else if (error.message.includes('404')) {
            errorMessage = '❌ 找不到指定的經文，請檢查書卷名稱和章節';
        } else if (error.message.includes('timeout')) {
            errorMessage = '❌ API請求超時，請稍後再試';
        } else {
            errorMessage += `\n\n錯誤類型: ${error.name || 'Unknown'}`;
        }
        
        await message.reply(errorMessage);
    }
}

// 顯示支援的書卷列表
function getBooksList() {
    const oldTestament = [
        '創', '出', '利', '民', '申', '書', '士', '得', '撒上', '撒下',
        '王上', '王下', '代上', '代下', '拉', '尼', '斯', '伯', '詩', '箴',
        '傳', '歌', '賽', '耶', '哀', '結', '但', '何', '珥', '摩',
        '俄', '拿', '彌', '鴻', '哈', '番', '該', '亞', '瑪'
    ];
    
    const newTestament = [
        '太', '可', '路', '約', '徒', '羅', '林前', '林後', '加', '弗',
        '腓', '西', '帖前', '帖後', '提前', '提後', '多', '門', '來', '雅',
        '彼前', '彼後', '約一', '約二', '約三', '猶', '啟'
    ];
    
    return {
        oldTestament: oldTestament.join(', '),
        newTestament: newTestament.join(', ')
    };
}

// Discord機器人事件
client.once('ready', () => {
    console.log(`聖經機器人已登入: ${client.user.tag}`);
    console.log('機器人啟動成功，使用IQ Bible API！');
});

// 訊息事件監聽器
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    const content = message.content.trim();
    
    if (content.startsWith('!')) {
        const command = content.slice(1).toLowerCase();
        
        if (command === 'bible' || command === 'help') {
            await message.reply(`📖 **聖經機器人使用說明**
使用IQ Bible API提供專業的聖經原文研讀功能

**支援格式：**
• \`太1:1\` - 查詢單節
• \`馬太福音1:1\` - 完整書名  
• \`詩23\` - 查詢整章
• \`約3:16\` - 任何書卷

**功能：**
• 經文查詢（繁體中文輸入，英文API查詢）
• Strong's number標記和互動查詢
• 完整的原文字典功能

**其他指令：**
• \`!books\` - 顯示書卷列表
• \`!test\` - 測試機器人
• \`!testapi\` - 測試API連接
• \`!apikey\` - 檢查API密鑰
• \`!help\` - 顯示此說明`);
            
        } else if (command === 'books') {
            const books = getBooksList();
            await message.reply(`📚 **聖經書卷列表**

**📜 舊約：** ${books.oldTestament}

**✨ 新約：** ${books.newTestament}`);
            
        } else if (command === 'test') {
            await message.reply('✅ 聖經機器人正常運作中！\n使用IQ Bible API\n試試輸入：太1:1');
            
        } else if (command === 'testapi') {
            try {
                await message.reply('🔍 **測試IQ Bible API連接...**');
                
                const data = await getBibleVerse('Genesis', 1, 1);
                
                let result = '✅ **IQ Bible API 連接成功！**\n\n';
                result += `**測試查詢:** Genesis 1:1\n`;
                result += `**API回應:** ${JSON.stringify(data).slice(0, 400)}...\n\n`;
                result += '**狀態:** API正常運作';
                
                await message.reply(result);
                
            } catch (error) {
                await message.reply(`❌ **IQ Bible API 測試失敗**\n\n**錯誤:** ${error.message}\n\n請檢查API密鑰是否正確設置`);
            }
            
        } else if (command === 'apikey') {
            await message.reply(`🔑 **API設置狀態**

**IQ Bible API Key:** ${IQ_BIBLE_API_KEY ? '✅ 已設置' : '❌ 未設置'}
**密鑰前綴:** ${IQ_BIBLE_API_KEY ? IQ_BIBLE_API_KEY.slice(0, 10) + '...' : 'N/A'}

${!IQ_BIBLE_API_KEY ? '⚠️ 請設置環境變量 IQ_BIBLE_API_KEY' : '✅ API密鑰配置正常'}`);
        }
        
        return;
    }
    
    const bibleRefPattern = /^[\u4e00-\u9fff]+\d+(:|\：|\s*第\s*)\d+|^[\u4e00-\u9fff]+\d+$/;
    
    if (bibleRefPattern.test(content)) {
        await handleBibleQuery(message, content);
    }
});

// 表情符號反應事件監聽器
client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('無法獲取反應:', error);
            return;
        }
    }
    
    const messageId = reaction.message.id;
    const emoji = reaction.emoji.name;
    
    if (messageStrongsMap.has(messageId)) {
        const strongs = messageStrongsMap.get(messageId);
        const selectedStrong = strongs.find(s => s.emoji === emoji);
        
        if (selectedStrong) {
            try {
                console.log('查詢Strong\'s number:', selectedStrong.number);
                const strongsData = await getStrongsData(selectedStrong.number);
                
                if (strongsData && (strongsData.definition || strongsData.meaning || strongsData.word)) {
                    const embed = new EmbedBuilder()
                        .setTitle(`📖 原文編號：${selectedStrong.number}`)
                        .setColor(0x0099ff);
                    
                    // 根據IQ Bible API的實際回應格式調整
                    if (strongsData.original || strongsData.word) {
                        embed.addFields({ 
                            name: '📜 原文', 
                            value: strongsData.original || strongsData.word, 
                            inline: true 
                        });
                    }
                    
                    if (strongsData.transliteration) {
                        embed.addFields({ 
                            name: '🔤 音譯', 
                            value: strongsData.transliteration, 
                            inline: true 
                        });
                    }
                    
                    if (strongsData.partOfSpeech || strongsData.grammar) {
                        embed.addFields({ 
                            name: '📝 詞性', 
                            value: strongsData.partOfSpeech || strongsData.grammar, 
                            inline: true 
                        });
                    }
                    
                    if (strongsData.definition || strongsData.meaning) {
                        embed.addFields({ 
                            name: '💭 字義解釋', 
                            value: (strongsData.definition || strongsData.meaning).slice(0, 1024)
                        });
                    }
                    
                    embed.setFooter({ text: '資料來源：IQ Bible API' });
                    
                    await reaction.message.reply({ embeds: [embed] });
                } else {
                    const embed = new EmbedBuilder()
                        .setTitle(`📖 原文編號：${selectedStrong.number}`)
                        .setColor(0xffa500)
                        .addFields(
                            { 
                                name: '📋 狀態', 
                                value: '已識別此Strong\'s編號，但詳細資料暫時無法取得' 
                            },
                            { 
                                name: '💡 說明', 
                                value: 'IQ Bible API正在處理此編號，或該編號需要不同的查詢格式' 
                            }
                        )
                        .setFooter({ text: '資料來源：IQ Bible API' });
                    
                    await reaction.message.reply({ embeds: [embed] });
                }
            } catch (error) {
                console.error('獲取Strong\'s資料時發生錯誤:', error);
                await reaction.message.reply(`❌ 查詢 ${selectedStrong.number} 時發生錯誤：${error.message}`);
            }
        }
    }
});

// 錯誤處理
client.on('error', (error) => {
    console.error('Discord客戶端錯誤:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('未處理的Promise拒絕:', error);
});

process.on('uncaughtException', (error) => {
    console.error('未捕獲的異常:', error);
});

// 優雅關閉
process.on('SIGINT', () => {
    console.log('收到SIGINT信號，正在關閉機器人...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('收到SIGTERM信號，正在關閉機器人...');
    client.destroy();
    process.exit(0);
});

// 登入Discord
client.login(DISCORD_TOKEN);
