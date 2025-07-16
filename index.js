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

// 從IQ Bible API獲取經文和Strong's numbers（增強版）
async function getBibleVerseWithStrongs(bookName, chapter, verse = null) {
    try {
        console.log('請求IQ Bible API（包含Strong\'s）:', { book: bookName, chapter, verse });
        
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
            const bookIds = {
                'Genesis': 1, 'Exodus': 2, 'Leviticus': 3, 'Numbers': 4, 'Deuteronomy': 5,
                'Matthew': 40, 'Mark': 41, 'Luke': 42, 'John': 43, 'Romans': 45
            };
            bookId = bookIds[bookName] || 1;
        }
        
        // 嘗試獲取原文和Strong's number
        let originalTextData = null;
        try {
            console.log('嘗試獲取原文和Strong\'s number...');
            const verseId = verse ? 
                `${bookId}${String(chapter).padStart(3, '0')}${String(verse).padStart(3, '0')}` :
                `${bookId}${String(chapter).padStart(3, '0')}001`;
            
            const originalResponse = await axios.get('https://iq-bible.p.rapidapi.com/GetOriginalText', {
                params: { 
                    verseId: verseId
                },
                timeout: 15000,
                headers: {
                    'X-RapidAPI-Host': 'iq-bible.p.rapidapi.com',
                    'X-RapidAPI-Key': IQ_BIBLE_API_KEY,
                    'Accept': 'application/json'
                }
            });
            
            console.log('GetOriginalText 回應:', JSON.stringify(originalResponse.data, null, 2));
            originalTextData = originalResponse.data;
        } catch (originalError) {
            console.log('GetOriginalText 失敗:', originalError.message);
        }
        
        // 嘗試獲取Words數據（可能包含Strong's）
        let wordsData = null;
        try {
            console.log('嘗試獲取Words數據...');
            const wordsResponse = await axios.get('https://iq-bible.p.rapidapi.com/GetWords', {
                params: {
                    verseId: verse ? 
                        `${bookId}${String(chapter).padStart(3, '0')}${String(verse).padStart(3, '0')}` :
                        `${bookId}${String(chapter).padStart(3, '0')}001`
                },
                timeout: 15000,
                headers: {
                    'X-RapidAPI-Host': 'iq-bible.p.rapidapi.com',
                    'X-RapidAPI-Key': IQ_BIBLE_API_KEY,
                    'Accept': 'application/json'
                }
            });
            
            console.log('GetWords 回應:', JSON.stringify(wordsResponse.data, null, 2));
            wordsData = wordsResponse.data;
        } catch (wordsError) {
            console.log('GetWords 失敗:', wordsError.message);
        }
        
        // 如果有Strong's數據，返回增強結果
        if (originalTextData || wordsData) {
            return {
                data: originalTextData || wordsData,
                endpoint: originalTextData ? 'GetOriginalText' : 'GetWords',
                hasStrongs: true
            };
        }
        
        // 回退到普通經文獲取
        return await getBibleVerse(bookName, chapter, verse);
        
    } catch (error) {
        console.error('獲取帶Strong\'s經文時發生錯誤:', error.message);
        // 回退到普通經文獲取
        return await getBibleVerse(bookName, chapter, verse);
    }
}

// 原有的經文獲取函數（保持不變作為回退）
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
            const bookIds = {
                'Genesis': 1, 'Exodus': 2, 'Leviticus': 3, 'Numbers': 4, 'Deuteronomy': 5,
                'Matthew': 40, 'Mark': 41, 'Luke': 42, 'John': 43
            };
            bookId = bookIds[bookName] || 1;
        }
        
        // 嘗試不同的API端點
        const endpoints = [
            {
                name: 'GetVerse',
                url: 'https://iq-bible.p.rapidapi.com/GetVerse',
                params: verse ? {
                    verseId: `${bookId}${String(chapter).padStart(3, '0')}${String(verse).padStart(3, '0')}`,
                    versionId: 'kjv'
                } : null
            },
            {
                name: 'GetChapter',
                url: 'https://iq-bible.p.rapidapi.com/GetChapter',
                params: {
                    chapterId: `${bookId}${String(chapter).padStart(3, '0')}`,
                    versionId: 'kjv'
                }
            },
            {
                name: 'GetChapterByBookAndChapterId',
                url: 'https://iq-bible.p.rapidapi.com/GetChapterByBookAndChapterId',
                params: {
                    bookAndChapterId: `${bookId}.${chapter}`,
                    versionId: 'kjv'
                }
            }
        ];
        
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
                
                if (response.data && response.status === 200) {
                    const hasData = Array.isArray(response.data) ? 
                        response.data.length > 0 : 
                        (typeof response.data === 'object' && Object.keys(response.data).length > 0) ||
                        (typeof response.data === 'string' && response.data.trim().length > 0);
                    
                    if (hasData) {
                        return {
                            data: response.data,
                            endpoint: endpoint.name,
                            hasStrongs: false
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
        throw error;
    }
}

// 解析Strong's number數據並添加上標
function parseStrongsNumbers(data, endpoint) {
    const strongsNumbers = [];
    
    try {
        console.log('解析Strong\'s number數據:', endpoint);
        
        if (endpoint === 'GetOriginalText') {
            // 解析GetOriginalText的回應 - 根據實際JSON格式
            if (Array.isArray(data)) {
                data.forEach((item, index) => {
                    // 根據實際JSON格式：strongs, word, glossary 等字段
                    if (item.strongs) {
                        const strongNumber = item.strongs;
                        const emoji = getEmojiForIndex(index);
                        strongsNumbers.push({
                            number: strongNumber,
                            word: item.word || '',
                            glossary: item.glossary || '',
                            emoji: emoji,
                            index: index,
                            pronun: item.pronun || ''
                        });
                    }
                });
            }
        } else if (endpoint === 'GetWords') {
            // 解析GetWords的回應
            if (Array.isArray(data)) {
                data.forEach((word, index) => {
                    if (word.strongsNumber || word.strongs || word.strong) {
                        const strongNumber = word.strongsNumber || word.strongs || word.strong;
                        const emoji = getEmojiForIndex(index);
                        strongsNumbers.push({
                            number: strongNumber,
                            word: word.word || word.text || '',
                            emoji: emoji,
                            index: index
                        });
                    }
                });
            }
        }
        
        console.log('解析出的Strong\'s numbers:', strongsNumbers.length);
        return strongsNumbers;
        
    } catch (error) {
        console.error('解析Strong\'s number時發生錯誤:', error);
        return [];
    }
}

// 獲取表情符號（根據索引）
function getEmojiForIndex(index) {
    if (index < NUMBER_EMOJIS.length) {
        return NUMBER_EMOJIS[index];
    } else if (index < NUMBER_EMOJIS.length + EXTENDED_EMOJIS.length) {
        return EXTENDED_EMOJIS[index - NUMBER_EMOJIS.length];
    } else {
        // 超過可用表情符號時，使用循環
        const totalEmojis = NUMBER_EMOJIS.length + EXTENDED_EMOJIS.length;
        const cycleIndex = index % totalEmojis;
        if (cycleIndex < NUMBER_EMOJIS.length) {
            return NUMBER_EMOJIS[cycleIndex];
        } else {
            return EXTENDED_EMOJIS[cycleIndex - NUMBER_EMOJIS.length];
        }
    }
}

// 將Strong's number添加到經文文本中
function addStrongsToText(text, strongsNumbers) {
    if (!strongsNumbers || strongsNumbers.length === 0) {
        return text;
    }
    
    let modifiedText = text;
    
    // 根據GetOriginalText的格式，創建帶有Strong's number上標的文本
    if (strongsNumbers.length > 0) {
        // 如果有原文字詞數據，重新組合文本並添加上標
        const wordsWithStrongs = strongsNumbers.map((strong, index) => {
            const strongsSuperscript = toSuperscript(strong.number);
            const word = strong.word || `[字詞${index + 1}]`;
            return `${word}${strongsSuperscript}`;
        });
        
        // 如果原文本為空或很短，使用Strong's數據重建
        if (!text || text.length < 20) {
            return wordsWithStrongs.join(' ');
        }
        
        // 否則嘗試在現有文本中添加上標
        strongsNumbers.forEach((strong, index) => {
            if (strong.word && strong.word.trim()) {
                // 清理希伯來文/希臘文字詞
                const cleanWord = strong.word.trim();
                if (cleanWord) {
                    const strongsSuperscript = toSuperscript(strong.number);
                    // 在原文字詞後添加上標編號
                    const regex = new RegExp(`${cleanWord.replace(/[.*+?^${}()|[\]\\]/g, '\\// 將Strong's number添加到經文文本中
function addStrongsToText(text, strongsNumbers) {
    if (!strongsNumbers || strongsNumbers.length === 0) {
        return text;
    }
    
    let modifiedText = text;
    
    // 嘗試將Strong's number作為上標添加到對應的字詞後面
    strongsNumbers.forEach((strong, index) => {
        if (strong.word && strong.word.trim()) {
            // 移除標點符號來匹配字詞
            const cleanWord = strong.word.replace(/[^\w\s]/g, '');
            if (cleanWord) {
                const strongsSuperscript = toSuperscript(strong.number.replace(/[^\d]/g, ''));
                // 在字詞後添加上標
                const regex = new RegExp(`\\b${cleanWord}\\b`, 'i');
                if (regex.test(modifiedText)) {
                    modifiedText = modifiedText.replace(regex, `${cleanWord}${strongsSuperscript}`);
                }
            }
        }
    });
    
    return modifiedText;
}')}`, 'g');
                    modifiedText = modifiedText.replace(regex, `${cleanWord}${strongsSuperscript}`);
                }
            }
        });
    }
    
    return modifiedText;
}

// 從IQ Bible API獲取Strong's number詳細資料（改進版）
async function getStrongsData(strongNumber) {
    try {
        console.log('查詢Strong\'s number:', strongNumber);
        
        // 清理Strong's number格式 - 移除前綴字母，只保留數字
        const cleanStrongNumber = strongNumber.replace(/[^\d]/g, '');
        
        // 嘗試不同的格式
        const formats = [
            cleanStrongNumber,                    // 純數字：7225
            `H${cleanStrongNumber}`,             // 希伯來文前綴：H7225
            `G${cleanStrongNumber}`,             // 希臘文前綴：G7225
            strongNumber                         // 原始格式
        ];
        
        for (const format of formats) {
            try {
                console.log(`嘗試查詢格式: ${format}`);
                
                const response = await axios.get('https://iq-bible.p.rapidapi.com/GetStrongs', {
                    params: {
                        strongsNumber: format
                    },
                    timeout: 10000,
                    headers: {
                        'X-RapidAPI-Host': 'iq-bible.p.rapidapi.com',
                        'X-RapidAPI-Key': IQ_BIBLE_API_KEY,
                        'Accept': 'application/json'
                    }
                });
                
                console.log(`GetStrongs 回應 (${format}):`, JSON.stringify(response.data, null, 2));
                
                if (response.data && response.status === 200) {
                    // 檢查是否有有效數據
                    const hasValidData = response.data.strongs_id || 
                                        response.data.word || 
                                        response.data.glossary ||
                                        (Array.isArray(response.data) && response.data.length > 0);
                    
                    if (hasValidData) {
                        return response.data;
                    }
                }
            } catch (formatError) {
                console.log(`格式 ${format} 查詢失敗:`, formatError.message);
                continue;
            }
        }
        
        console.log('所有格式都未找到結果');
        return null;
        
    } catch (error) {
        console.error('獲取Strong\'s資料時發生錯誤:', error.message);
        return null;
    }
}

// 處理IQ Bible API的回應，解析經文和Strong's numbers（增強版）
function parseIQBibleResponse(apiResponse, bookName, chapter, verse) {
    try {
        console.log('開始解析IQ Bible回應...');
        console.log('API端點:', apiResponse.endpoint);
        console.log('是否包含Strong\'s:', apiResponse.hasStrongs);
        
        const data = apiResponse.data;
        
        if (!data) {
            console.log('API回應為空');
            return null;
        }
        
        let verseText = '';
        let strongsNumbers = [];
        
        // 如果有Strong's數據，先解析
        if (apiResponse.hasStrongs) {
            strongsNumbers = parseStrongsNumbers(data, apiResponse.endpoint);
        }
        
        // 根據不同的API端點解析經文文本
        switch (apiResponse.endpoint) {
            case 'GetOriginalText':
                if (Array.isArray(data)) {
                    // 從原文數據組合經文，每個字詞包含希伯來文/希臘文
                    verseText = data.map(item => item.word || '').join(' ');
                    
                    // 如果有Strong's數據，添加上標
                    if (strongsNumbers.length > 0) {
                        verseText = addStrongsToText(verseText, strongsNumbers);
                    }
                } else if (data.text || data.verse) {
                    verseText = data.text || data.verse;
                }
                break;
                
            case 'GetWords':
                if (Array.isArray(data)) {
                    verseText = data.map(word => word.word || word.text || '').join(' ');
                } else if (data.text) {
                    verseText = data.text;
                }
                break;
                
            case 'GetVerse':
                if (Array.isArray(data) && data.length > 0) {
                    const verseData = data[0];
                    verseText = verseData.t || verseData.text || verseData.verseText || '';
                } else if (data.t || data.text) {
                    verseText = data.t || data.text || data.verseText || '';
                }
                break;
                
            case 'GetChapter':
                if (Array.isArray(data)) {
                    if (verse) {
                        const targetVerse = data.find(v => v.v == verse || v.verse == verse);
                        if (targetVerse) {
                            verseText = targetVerse.t || targetVerse.text || targetVerse.verseText || '';
                        }
                    } else {
                        verseText = data.map(v => 
                            `${v.v || v.verse}. ${v.t || v.text || v.verseText || ''}`
                        ).join(' ');
                    }
                }
                break;
                
            case 'GetChapterByBookAndChapterId':
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
                if (Array.isArray(data) && data.length > 0) {
                    const firstItem = data[0];
                    verseText = firstItem.t || firstItem.text || firstItem.verseText || '';
                } else if (data.t || data.text) {
                    verseText = data.t || data.text;
                } else if (typeof data === 'string') {
                    verseText = data;
                }
        }
        
        // 清理經文文本
        verseText = verseText.trim();
        
        console.log('解析出的經文文本:', verseText);
        console.log('Strong\'s numbers 數量:', strongsNumbers.length);
        
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
client.login(DISCORD_TOKEN);
