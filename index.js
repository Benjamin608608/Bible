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
        
        // 先獲取書卷ID
        let bookId = null;
        try {
            const bookIdResponse = await axios.get('https://iq-bible.p.rapidapi.com/GetBookIdByBookName', {
                params: { bookName: bookName },
                timeout: 10000,
                headers: {
                    'X-RapidAPI-Host': 'iq-bible.p.rapidapi.com',
                    'X-RapidAPI-Key': IQ_BIBLE_API_KEY,
                    'Accept': 'application/json'
                }
            });
            bookId = bookIdResponse.data.bookId || bookIdResponse.data;
            console.log(`${bookName} 的書卷ID:`, bookId);
        } catch (error) {
            console.log('獲取書卷ID失敗，使用預設值');
            // 使用常見的書卷ID作為後備
            const bookIds = {
                'Genesis': 1, 'Exodus': 2, 'Leviticus': 3, 'Numbers': 4, 'Deuteronomy': 5,
                'Matthew': 40, 'Mark': 41, 'Luke': 42, 'John': 43
            };
            bookId = bookIds[bookName] || 1;
        }
        
        // 嘗試不同的API端點
        const endpoints = [
            // 使用GetVerse端點
            {
                name: 'GetVerse',
                url: 'https://iq-bible.p.rapidapi.com/GetVerse',
                params: verse ? {
                    verseId: `${bookId}${String(chapter).padStart(3, '0')}${String(verse).padStart(3, '0')}`,
                    versionId: 'kjv'
                } : null
            },
            // 使用GetChapter端點
            {
                name: 'GetChapter',
                url: 'https://iq-bible.p.rapidapi.com/GetChapter',
                params: {
                    chapterId: `${bookId}${String(chapter).padStart(3, '0')}`,
                    versionId: 'kjv'
                }
            },
            // 使用GetChapterByBookAndChapterId端點
            {
                name: 'GetChapterByBookAndChapterId',
                url: 'https://iq-bible.p.rapidapi.com/GetChapterByBookAndChapterId',
                params: {
                    bookAndChapterId: `${bookId}.${chapter}`,
                    versionId: 'kjv'
                }
            }
        ];
        
        // 過濾掉無效的端點
        const validEndpoints = endpoints.filter(ep => ep.params !== null);
        
        for (const endpoint of validEndpoints) {
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
                
                // 檢查是否有有效數據
                if (response.data && response.status === 200) {
                    // 檢查數據是否不為空
                    const hasData = Array.isArray(response.data) ? 
                        response.data.length > 0 : 
                        (typeof response.data === 'object' && Object.keys(response.data).length > 0) ||
                        (typeof response.data === 'string' && response.data.trim().length > 0);
                    
                    if (hasData) {
                        return {
                            data: response.data,
                            endpoint: endpoint.name
                        };
                    }
                }
            } catch (endpointError) {
                console.log(`${endpoint.name} 失敗:`, endpointError.response?.status, endpointError.message);
                continue;
            }
        }
        
        throw new Error('所有API端點都返回空數據或失敗');
        
    } catch (error) {
        console.error('獲取經文時發生錯誤:', error.message);
        if (error.response) {
            console.error('錯誤詳情:', error.response.status, error.response.data);
        }
        throw error;
    }
}

// 獲取原文文本（帶Strong's numbers）
async function getOriginalText(bookName, chapter, verse) {
    try {
        console.log('查詢原文文本:', { book: bookName, chapter, verse });
        
        // 先獲取書卷ID
        let bookId = null;
        try {
            const bookIdResponse = await axios.get('https://iq-bible.p.rapidapi.com/GetBookIdByBookName', {
                params: { bookName: bookName },
                timeout: 10000,
                headers: {
                    'X-RapidAPI-Host': 'iq-bible.p.rapidapi.com',
                    'X-RapidAPI-Key': IQ_BIBLE_API_KEY,
                    'Accept': 'application/json'
                }
            });
            bookId = bookIdResponse.data.bookId || bookIdResponse.data;
            console.log(`${bookName} 的原文查詢書卷ID:`, bookId);
        } catch (error) {
            console.log('獲取原文查詢書卷ID失敗，使用預設值');
            const bookIds = {
                'Genesis': 1, 'Exodus': 2, 'Leviticus': 3, 'Numbers': 4, 'Deuteronomy': 5,
                'Matthew': 40, 'Mark': 41, 'Luke': 42, 'John': 43
            };
            bookId = bookIds[bookName] || 1;
        }
        
        const verseId = `${bookId}${String(chapter).padStart(3, '0')}${String(verse).padStart(3, '0')}`;
        console.log('構建的原文查詢 verseId:', verseId);
        
        const response = await axios.get('https://iq-bible.p.rapidapi.com/GetOriginalText', {
            params: { verseId: verseId },
            timeout: 15000,
            headers: {
                'X-RapidAPI-Host': 'iq-bible.p.rapidapi.com',
                'X-RapidAPI-Key': IQ_BIBLE_API_KEY,
                'Accept': 'application/json'
            }
        });
        
        console.log('GetOriginalText 回應狀態:', response.status);
        console.log('GetOriginalText 回應數據:', JSON.stringify(response.data, null, 2));
        
        if (response.data && response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
            return response.data;
        }
        
        return null;
    } catch (error) {
        console.error('GetOriginalText 失敗:', error.message);
        return null;
    }
}

// 從IQ Bible API獲取Strong's number詳細資料
async function getStrongsData(strongNumber) {
    try {
        console.log('查詢Strong\'s number:', strongNumber);
        
        // 使用GetStrongs端點
        const response = await axios.get('https://iq-bible.p.rapidapi.com/GetStrongs', {
            params: {
                strongsNumber: strongNumber
            },
            timeout: 10000,
            headers: {
                'X-RapidAPI-Host': 'iq-bible.p.rapidapi.com',
                'X-RapidAPI-Key': IQ_BIBLE_API_KEY,
                'Accept': 'application/json'
            }
        });
        
        console.log('GetStrongs 回應:', JSON.stringify(response.data, null, 2));
        
        if (response.data && response.status === 200) {
            return response.data;
        }
        
        return null;
    } catch (error) {
        console.error('獲取Strong\'s資料時發生錯誤:', error.message);
        return null;
    }
}

// 處理IQ Bible API的回應，解析經文和Strong's numbers
function parseIQBibleResponse(apiResponse, bookName, chapter, verse, originalTextData = null) {
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
            case 'GetVerse':
                console.log('解析GetVerse回應...');
                if (Array.isArray(data) && data.length > 0) {
                    // 數據是數組格式
                    const verseData = data[0];
                    verseText = verseData.t || verseData.text || verseData.verseText || '';
                    console.log('從GetVerse提取的經文:', verseText);
                } else if (data.t || data.text) {
                    // 數據是對象格式
                    verseText = data.t || data.text || data.verseText || '';
                    console.log('從GetVerse對象提取的經文:', verseText);
                }
                break;
                
            case 'GetChapter':
                console.log('解析GetChapter回應...');
                if (Array.isArray(data)) {
                    if (verse) {
                        // 查找特定經節
                        const targetVerse = data.find(v => v.v == verse || v.verse == verse);
                        if (targetVerse) {
                            verseText = targetVerse.t || targetVerse.text || targetVerse.verseText || '';
                        }
                    } else {
                        // 返回整章
                        verseText = data.map(v => 
                            `${v.v || v.verse}. ${v.t || v.text || v.verseText || ''}`
                        ).join(' ');
                    }
                }
                break;
                
            case 'GetChapterByBookAndChapterId':
                console.log('解析GetChapterByBookAndChapterId回應...');
                if (data.chapter && data.chapter.verses) {
                    if (verse) {
                        const targetVerse = data.chapter.verses.find(v => v.verseNumber == verse);
                        if (targetVerse) {
                            verseText = targetVerse.text || targetVerse.t || '';
                        }
                    } else {
                        verseText = data.chapter.verses.map(v => 
                            `${v.verseNumber}. ${v.text || v.t || ''}`
                        ).join(' ');
                    }
                } else if (Array.isArray(data)) {
                    // 有時候直接返回經節數組
                    if (verse) {
                        const targetVerse = data.find(v => v.v == verse);
                        if (targetVerse) {
                            verseText = targetVerse.t || targetVerse.text || '';
                        }
                    } else {
                        verseText = data.map(v => 
                            `${v.v}. ${v.t || v.text || ''}`
                        ).join(' ');
                    }
                }
                break;
                
            default:
                console.log('使用通用解析...');
                if (Array.isArray(data) && data.length > 0) {
                    const firstItem = data[0];
                    verseText = firstItem.t || firstItem.text || firstItem.verseText || '';
                } else if (data.t || data.text) {
                    verseText = data.t || data.text;
                } else if (typeof data === 'string') {
                    verseText = data;
                }
        }
        
        // 如果有原文數據且為單節查詢，處理Strong's編號並重建經文
        if (originalTextData && verse && Array.isArray(originalTextData)) {
            console.log('處理原文數據，包含', originalTextData.length, '個詞彙');
            
            // 提取Strong's編號信息
            const strongsData = originalTextData
                .filter(wordData => wordData.strongs)
                .map((wordData, index) => ({
                    number: wordData.strongs,
                    word: wordData.word || '',
                    glossary: wordData.glossary || '',
                    pronunciation: wordData.pronun ? JSON.parse(wordData.pronun).dic || '' : '',
                    emoji: index < NUMBER_EMOJIS.length ? 
                        NUMBER_EMOJIS[index] : 
                        EXTENDED_EMOJIS[index - NUMBER_EMOJIS.length] || '❓',
                    originalOrder: wordData.orig_order || (index + 1)
                }));
            
            strongsNumbers = strongsData.slice(0, 20); // 限制數量
            
            // 從 glossary 重建帶上標的英文經文
            if (strongsNumbers.length > 0) {
                console.log('從原文數據重建帶上標的英文經文');
                
                const englishWords = originalTextData.map((wordData, index) => {
                    const glossary = wordData.glossary || '';
                    let englishWord = '';
                    
                    // 從 glossary 提取 KJV 翻譯
                    const kjvMatch = glossary.match(/KJV:\s*([^.]+)\./);
                    if (kjvMatch) {
                        const kjvText = kjvMatch[1].trim();
                        // 提取第一個有意義的單字
                        const words = kjvText.split(',');
                        englishWord = words[0].trim();
                        
                        // 清理特殊標記
                        englishWord = englishWord.replace(/^X\s+/, ''); // 移除 X 前綴
                        englishWord = englishWord.replace(/\s*\([^)]*\)/g, ''); // 移除括號內容
                        englishWord = englishWord.replace(/[+\-]/g, ''); // 移除加減號
                        englishWord = englishWord.trim();
                        
                        // 特殊處理
                        if (kjvText.includes('(as such unrepresented in English)') || englishWord === '') {
                            englishWord = ''; // 不在英文中表示的詞
                        }
                    }
                    
                    // 如果有Strong's編號且有英文單字，添加上標
                    if (wordData.strongs && englishWord) {
                        const strongsIndex = strongsData.findIndex(s => s.number === wordData.strongs);
                        if (strongsIndex !== -1) {
                            const superscript = toSuperscript(strongsIndex + 1);
                            englishWord += superscript;
                        }
                    }
                    
                    return englishWord;
                }).filter(word => word.length > 0);
                
                if (englishWords.length > 0) {
                    // 優先使用重建的帶上標經文
                    const reconstructedText = englishWords.join(' ');
                    console.log('重建的帶上標經文:', reconstructedText);
                    
                    // 只有當重建的經文合理時才使用，否則保留原來的經文
                    if (reconstructedText.length > 10) { // 基本長度檢查
                        verseText = reconstructedText;
                    }
                }
            }
            
            console.log('提取到', strongsNumbers.length, '個Strong\'s編號');
        }
        
        // 清理經文文本
        verseText = verseText.trim();
        
        console.log('解析出的經文文本:', verseText);
        console.log('經文文本長度:', verseText.length);
        
        // 限制長度以避免Discord限制
        if (verseText.length > 1500) {
            console.log('經文文本過長，進行截斷:', verseText.length);
            verseText = verseText.slice(0, 1500) + '...';
        }
        
        return {
            record: [{
                book: bookName,
                chapter: chapter,
                verse: verse,
                text: verseText
            }],
            strongs: strongsNumbers
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
        
        // 獲取英文經文
        const data = await getBibleVerse(parsed.book, parsed.chapter, parsed.verse);
        
        // 如果是單節查詢，同時獲取原文數據
        let originalTextData = null;
        if (parsed.verse) {
            try {
                originalTextData = await getOriginalText(parsed.book, parsed.chapter, parsed.verse);
                if (originalTextData) {
                    console.log('成功獲取原文數據');
                }
            } catch (error) {
                console.log('獲取原文數據失敗:', error.message);
            }
        }
        
        const formatted = parseIQBibleResponse(data, parsed.bookName, parsed.chapter, parsed.verse, originalTextData);
        
        if (!formatted || !formatted.record || formatted.record.length === 0) {
            await message.reply('❌ 找不到指定的經文，請檢查書卷名稱和章節是否正確。');
            return;
        }
        
        const record = formatted.record[0];
        let responseText = `**${parsed.bookName} ${record.chapter}${record.verse ? ':' + record.verse : ''}**`;
        
        // 检查是否有经文内容
        if (record.text && record.text.trim() && record.text !== '解析失敗，請稍後再試') {
            responseText += `\n\n${record.text}`;
        } else {
            responseText += '\n\n⚠️ 经文内容获取失败，请检查API回应';
            console.log('经文内容为空或无效:', record.text);
        }
        
        // 如果有Strong's numbers，添加提示
        if (formatted.strongs && formatted.strongs.length > 0) {
            responseText += '\n\n🔍 *點擊下方表情符號查看原文字義*';
        }
        
        // 添加版本資訊
        responseText += '\n\n*版本: King James Version (KJV)*';
        
        // 显示调试信息（临时）
        console.log('最终回应文本:', responseText);
        console.log('回应文本长度:', responseText.length);
        
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
            }, 1800000); // 30分鐘後清理
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
• \`太1:1\` - 查詢單節（KJV英文版 + Strong's編號）
• \`馬太福音1:1\` - 完整書名  
• \`詩23\` - 查詢整章（KJV英文版）
• \`約3:16\` - 任何書卷

**功能特色：**
• 📜 **KJV英文版本** - 經典英文聖經
• 🔤 **原文研讀** - 希伯來文/希臘文 Strong's 編號
• 🔢 **上標數字** - 英文單字帶上標，對應表情符號編號
• 🎯 **互動查詢** - 點擊表情符號查看原文字義
• 📚 **完整字典** - 包含發音、詞性、字義解釋

**使用說明：**
1. 查詢經文會顯示帶上標數字的英文版本
2. 上標數字對應下方的表情符號 (¹→1️⃣, ²→2️⃣)
3. 點擊表情符號查看該單字的原文詳細資訊

**其他指令：**
• \`!books\` - 顯示書卷列表
• \`!test\` - 測試機器人
• \`!testapi\` - 測試API連接
• \`!apikey\` - 檢查API密鑰
• \`!help\` - 顯示此說明

**💡 提示：** 查詢單節經文時會自動提供 Strong's 編號功能！`);
            
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
            
        } else if (command === 'teststrongs') {
            try {
                await message.reply('🔍 **測試 Strong\'s API 不同格式...**');
                
                const testNumber = '7225'; // 創世記1:1第一個詞
                const testFormats = [
                    // 不同的參數名稱
                    { endpoint: 'GetStrongs', params: { strongsNumber: testNumber }, desc: '原格式' },
                    { endpoint: 'GetStrongs', params: { strongNumber: testNumber }, desc: '無s格式' },
                    { endpoint: 'GetStrongs', params: { strongs: testNumber }, desc: 'strongs格式' },
                    { endpoint: 'GetStrongs', params: { number: testNumber }, desc: 'number格式' },
                    { endpoint: 'GetStrongs', params: { id: testNumber }, desc: 'id格式' },
                    
                    // 不同的數字格式
                    { endpoint: 'GetStrongs', params: { strongsNumber: `H${testNumber}` }, desc: 'H前綴格式' },
                    { endpoint: 'GetStrongs', params: { strongsNumber: `0${testNumber}` }, desc: '前導零格式' },
                    { endpoint: 'GetStrongs', params: { strongsNumber: `${testNumber.padStart(5, '0')}` }, desc: '5位數格式' },
                ];
                
                let results = '**Strong\'s API 測試結果:**\n\n';
                
                for (const test of testFormats) {
                    try {
                        console.log(`測試 ${test.desc}:`, test.params);
                        
                        const response = await axios.get(`https://iq-bible.p.rapidapi.com/${test.endpoint}`, {
                            params: test.params,
                            timeout: 10000,
                            headers: {
                                'X-RapidAPI-Host': 'iq-bible.p.rapidapi.com',
                                'X-RapidAPI-Key': IQ_BIBLE_API_KEY,
                                'Accept': 'application/json'
                            }
                        });
                        
                        const dataPreview = JSON.stringify(response.data).slice(0, 100);
                        
                        if (response.data && response.data !== "" && response.data !== null) {
                            results += `✅ **${test.desc}**: 成功\n`;
                            results += `   數據: ${dataPreview}...\n\n`;
                        } else {
                            results += `❌ **${test.desc}**: 空數據\n\n`;
                        }
                        
                    } catch (error) {
                        results += `❌ **${test.desc}**: 錯誤 - ${error.message}\n\n`;
                    }
                    
                    // 分批發送避免過長
                    if (results.length > 1500) {
                        await message.reply(results);
                        results = '';
                    }
                }
                
                if (results) {
                    await message.reply(results);
                }
                
            } catch (error) {
                await message.reply(`❌ 測試失敗：${error.message}`);
            }
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
                
                if (strongsData) {
                    const embed = new EmbedBuilder()
                        .setTitle(`📖 原文編號：${selectedStrong.number}`)
                        .setColor(0x0099ff);
                    
                    // 根據API回應格式調整顯示內容
                    if (strongsData.original || strongsData.word || strongsData.originalWord) {
                        embed.addFields({ 
                            name: '📜 原文', 
                            value: strongsData.original || strongsData.word || strongsData.originalWord, 
                            inline: true 
                        });
                    }
                    
                    if (strongsData.transliteration || strongsData.pronunciation) {
                        embed.addFields({ 
                            name: '🔤 音譯', 
                            value: strongsData.transliteration || strongsData.pronunciation, 
                            inline: true 
                        });
                    }
                    
                    if (strongsData.partOfSpeech || strongsData.grammar || strongsData.pos) {
                        embed.addFields({ 
                            name: '📝 詞性', 
                            value: strongsData.partOfSpeech || strongsData.grammar || strongsData.pos, 
                            inline: true 
                        });
                    }
                    
                    if (strongsData.definition || strongsData.meaning || strongsData.shortDefinition) {
                        const definition = strongsData.definition || strongsData.meaning || strongsData.shortDefinition;
                        embed.addFields({ 
                            name: '💭 字義解釋', 
                            value: definition.slice(0, 1024)
                        });
                    }
                    
                    if (strongsData.longDefinition && strongsData.longDefinition !== (strongsData.definition || strongsData.meaning)) {
                        embed.addFields({ 
                            name: '📚 詳細解釋', 
                            value: strongsData.longDefinition.slice(0, 1024)
                        });
                    }
                    
                    if (selectedStrong.word) {
                        embed.addFields({ 
                            name: '🎯 經文中的用法', 
                            value: selectedStrong.word, 
                            inline: true 
                        });
                    }
                    
                    embed.setFooter({ text: '資料來源：IQ Bible API' });
                    
                    await reaction.message.reply({ embeds: [embed] });
                } else {
                    // API沒有返回數據，但我們有本地的glossary數據 - 這是常見情況
                    console.log('API返回空數據，使用本地glossary數據');
                    if (selectedStrong.glossary) {
                        const embed = new EmbedBuilder()
                            .setTitle(`📖 原文編號：Strong's ${selectedStrong.number}`)
                            .setColor(0x0099ff);
                        
                        if (selectedStrong.word) {
                            embed.addFields({ 
                                name: '📜 原文', 
                                value: selectedStrong.word, 
                                inline: true 
                            });
                        }
                        
                        if (selectedStrong.pronunciation) {
                            embed.addFields({ 
                                name: '🔤 發音', 
                                value: selectedStrong.pronunciation, 
                                inline: true 
                            });
                        }
                        
                        // 解析 glossary 格式
                        const glossary = selectedStrong.glossary;
                        const lines = glossary.split('\n');
                        
                        // 提取詞性和基本定義
                        if (lines[0]) {
                            const firstLine = lines[0];
                            const posMatch = firstLine.match(/\)\s*([^.]+)\./);
                            if (posMatch) {
                                embed.addFields({ 
                                    name: '📝 詞性', 
                                    value: posMatch[1], 
                                    inline: true 
                                });
                            }
                        }
                        
                        // 提取KJV翻譯
                        const kjvMatch = glossary.match(/KJV:\s*([^.]+)\./);
                        if (kjvMatch) {
                            embed.addFields({ 
                                name: '💭 KJV翻譯', 
                                value: kjvMatch[1]
                            });
                        }
                        
                        // 提取詳細定義 (數字編號的定義)
                        const definitionMatches = glossary.match(/\d+\.\s*([^\n]+)/g);
                        if (definitionMatches) {
                            const definitions = definitionMatches.slice(0, 3).join('\n'); // 最多顯示3個定義
                            embed.addFields({ 
                                name: '📚 詳細解釋', 
                                value: definitions.slice(0, 1024)
                            });
                        }
                        
                        // 提取詞根信息
                        const rootMatch = glossary.match(/Root\(s\):\s*([^\n]+)/);
                        if (rootMatch) {
                            embed.addFields({ 
                                name: '🌱 詞根', 
                                value: rootMatch[1], 
                                inline: true 
                            });
                        }
                        
                        embed.setFooter({ text: '資料來源：IQ Bible API 原文數據' });
                        
                        await reaction.message.reply({ embeds: [embed] });
                    } else {
                        const embed = new EmbedBuilder()
                            .setTitle(`📖 原文編號：Strong's ${selectedStrong.number}`)
                            .setColor(0xffa500)
                            .addFields(
                                { 
                                    name: '📋 狀態', 
                                    value: '已識別此Strong\'s編號，但詳細資料暫時無法取得' 
                                },
                                { 
                                    name: '💡 說明', 
                                    value: 'API可能正在處理此編號，或該編號格式需要調整' 
                                }
                            );
                        
                        if (selectedStrong.word) {
                            embed.addFields({ 
                                name: '🎯 經文中的用法', 
                                value: selectedStrong.word
                            });
                        }
                        
                        embed.setFooter({ text: '資料來源：IQ Bible API' });
                        
                        await reaction.message.reply({ embeds: [embed] });
                    }
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
