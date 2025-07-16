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

// 製作API請求的通用函數
async function makeAPIRequest(endpoint, params = {}) {
    try {
        const response = await axios.get(`https://iq-bible.p.rapidapi.com/${endpoint}`, {
            params: params,
            timeout: 15000,
            headers: {
                'X-RapidAPI-Host': 'iq-bible.p.rapidapi.com',
                'X-RapidAPI-Key': IQ_BIBLE_API_KEY,
                'Accept': 'application/json'
            }
        });
        
        console.log(`${endpoint} 回應狀態:`, response.status);
        console.log(`${endpoint} 回應數據:`, JSON.stringify(response.data, null, 2));
        
        return response.data;
    } catch (error) {
        console.error(`${endpoint} 請求失敗:`, error.message);
        if (error.response) {
            console.error('錯誤詳情:', error.response.status, error.response.data);
        }
        throw error;
    }
}

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

// 獲取書卷ID
async function getBookId(bookName) {
    try {
        console.log('獲取書卷ID:', bookName);
        const bookId = await makeAPIRequest('GetBookIdByBookName', { bookName: bookName });
        console.log(`${bookName} 的書卷ID:`, bookId);
        
        // 如果 API 返回 null 或 undefined，使用預設值
        if (bookId === null || bookId === undefined) {
            console.log('API 返回 null，使用預設書卷ID');
            throw new Error('API returned null');
        }
        
        return bookId;
    } catch (error) {
        console.log('獲取書卷ID失敗，使用預設值');
        // 使用標準的書卷ID作為後備（2位數字格式）
        const bookIds = {
            // 舊約 (01-39)
            'Genesis': '01', 'Exodus': '02', 'Leviticus': '03', 'Numbers': '04', 'Deuteronomy': '05',
            'Joshua': '06', 'Judges': '07', 'Ruth': '08', '1Samuel': '09', '2Samuel': '10',
            '1Kings': '11', '2Kings': '12', '1Chronicles': '13', '2Chronicles': '14', 'Ezra': '15',
            'Nehemiah': '16', 'Esther': '17', 'Job': '18', 'Psalms': '19', 'Proverbs': '20',
            'Ecclesiastes': '21', 'SongofSongs': '22', 'Isaiah': '23', 'Jeremiah': '24', 'Lamentations': '25',
            'Ezekiel': '26', 'Daniel': '27', 'Hosea': '28', 'Joel': '29', 'Amos': '30',
            'Obadiah': '31', 'Jonah': '32', 'Micah': '33', 'Nahum': '34', 'Habakkuk': '35',
            'Zephaniah': '36', 'Haggai': '37', 'Zechariah': '38', 'Malachi': '39',
            
            // 新約 (40-66)
            'Matthew': '40', 'Mark': '41', 'Luke': '42', 'John': '43', 'Acts': '44',
            'Romans': '45', '1Corinthians': '46', '2Corinthians': '47', 'Galatians': '48', 'Ephesians': '49',
            'Philippians': '50', 'Colossians': '51', '1Thessalonians': '52', '2Thessalonians': '53', '1Timothy': '54',
            '2Timothy': '55', 'Titus': '56', 'Philemon': '57', 'Hebrews': '58', 'James': '59',
            '1Peter': '60', '2Peter': '61', '1John': '62', '2John': '63', '3John': '64',
            'Jude': '65', 'Revelation': '66'
        };
        
        const defaultId = bookIds[bookName];
        console.log(`使用預設書卷ID: ${bookName} = ${defaultId}`);
        return defaultId || '01';
    }
}

// 獲取中文聖經版本
async function getChineseVerse(bookName, chapter, verse) {
    try {
        console.log('查詢中文經文:', { book: bookName, chapter, verse });
        
        const bookId = await getBookId(bookName);
        const verseId = `${bookId}${String(chapter).padStart(3, '0')}${String(verse).padStart(3, '0')}`;
        
        console.log('構建的中文查詢 verseId:', verseId);
        
        // 嘗試不同的中文版本
        const chineseVersions = ['cuv', 'cuvs', 'cuvt', 'chinese', 'cht', 'chs'];
        
        for (const version of chineseVersions) {
            try {
                console.log(`嘗試中文版本: ${version}`);
                const data = await makeAPIRequest('GetVerse', { 
                    verseId: verseId,
                    version: version
                });
                
                if (data && data !== false && data !== null && (typeof data === 'string' || (Array.isArray(data) && data.length > 0) || (typeof data === 'object' && Object.keys(data).length > 0))) {
                    console.log(`成功獲取中文版本: ${version}`);
                    return {
                        data: data,
                        endpoint: 'GetVerse',
                        verseId: verseId,
                        version: version
                    };
                }
            } catch (error) {
                console.log(`中文版本 ${version} 失敗:`, error.message);
            }
        }
        
        // 如果所有中文版本都失敗，嘗試不帶版本參數
        console.log('嘗試不帶版本參數的中文查詢');
        const data = await makeAPIRequest('GetVerse', { verseId: verseId });
        
        if (data && data !== false && data !== null && (typeof data === 'string' || (Array.isArray(data) && data.length > 0) || (typeof data === 'object' && Object.keys(data).length > 0))) {
            return {
                data: data,
                endpoint: 'GetVerse',
                verseId: verseId
            };
        } else {
            throw new Error('所有中文版本查詢都返回無效數據');
        }
    } catch (error) {
        console.error('獲取中文經文失敗:', error.message);
        throw error;
    }
}

// 獲取中文整章
async function getChineseChapter(bookName, chapter) {
    try {
        console.log('查詢中文整章:', { book: bookName, chapter });
        
        const bookId = await getBookId(bookName);
        const chapterId = `${bookId}${String(chapter).padStart(3, '0')}`;
        
        console.log('構建的中文章節 chapterId:', chapterId);
        
        // 嘗試不同的中文版本
        const chineseVersions = ['cuv', 'cuvs', 'cuvt', 'chinese'];
        
        for (const version of chineseVersions) {
            try {
                console.log(`嘗試中文章節版本: ${version}`);
                const data = await makeAPIRequest('GetChapter', { 
                    chapterId: chapterId,
                    version: version
                });
                
                if (data && Array.isArray(data) && data.length > 0) {
                    console.log(`成功獲取中文章節版本: ${version}`);
                    return {
                        data: data,
                        endpoint: 'GetChapter',
                        chapterId: chapterId,
                        version: version
                    };
                }
            } catch (error) {
                console.log(`中文章節版本 ${version} 失敗:`, error.message);
            }
        }
        
        // 如果所有中文版本都失敗，嘗試不帶版本參數
        console.log('嘗試不帶版本參數的中文章節查詢');
        const data = await makeAPIRequest('GetChapter', { chapterId: chapterId });
        
        return {
            data: data,
            endpoint: 'GetChapter',
            chapterId: chapterId
        };
    } catch (error) {
        console.error('獲取中文章節失敗:', error.message);
        throw error;
    }
}

// 獲取英文版本（作為後備）
async function getVerse(bookName, chapter, verse) {
    try {
        console.log('查詢英文經文:', { book: bookName, chapter, verse });
        
        const bookId = await getBookId(bookName);
        const verseId = `${bookId}${String(chapter).padStart(3, '0')}${String(verse).padStart(3, '0')}`;
        
        const data = await makeAPIRequest('GetVerse', { verseId: verseId });
        
        return {
            data: data,
            endpoint: 'GetVerse',
            verseId: verseId
        };
    } catch (error) {
        console.error('獲取英文經文失敗:', error.message);
        throw error;
    }
}

// 獲取英文整章（作為後備）
async function getChapter(bookName, chapter) {
    try {
        console.log('查詢英文整章:', { book: bookName, chapter });
        
        const bookId = await getBookId(bookName);
        const chapterId = `${bookId}${String(chapter).padStart(3, '0')}`;
        
        const data = await makeAPIRequest('GetChapter', { chapterId: chapterId });
        
        return {
            data: data,
            endpoint: 'GetChapter',
            chapterId: chapterId
        };
    } catch (error) {
        console.error('獲取英文章節失敗:', error.message);
        throw error;
    }
}

// 獲取原文文本（帶Strong's numbers）
async function getOriginalText(bookName, chapter, verse) {
    try {
        console.log('查詢原文文本:', { book: bookName, chapter, verse });
        
        const bookId = await getBookId(bookName);
        
        // 檢查 bookId 是否有效
        if (!bookId) {
            throw new Error(`無效的書卷ID: ${bookId}`);
        }
        
        const verseId = `${bookId}${String(chapter).padStart(3, '0')}${String(verse).padStart(3, '0')}`;
        console.log('構建的原文查詢 verseId:', verseId);
        
        const data = await makeAPIRequest('GetOriginalText', { verseId: verseId });
        
        // 檢查回應是否有效
        if (!data || (Array.isArray(data) && data.length === 0)) {
            console.log('GetOriginalText 返回空數據');
            return null;
        }
        
        return {
            data: data,
            endpoint: 'GetOriginalText',
            verseId: verseId
        };
    } catch (error) {
        console.error('GetOriginalText 失敗:', error.message);
        return null;
    }
}

// 獲取Strong's number詳細資料
async function getStrongsData(strongNumber) {
    try {
        console.log('查詢Strong\'s number:', strongNumber);
        const data = await makeAPIRequest('GetStrongs', { strongNumber: strongNumber });
        return data;
    } catch (error) {
        console.error('獲取Strong\'s資料失敗:', error.message);
        return null;
    }
}

// 獲取聖經版本列表
async function getBibleVersions() {
    try {
        const data = await makeAPIRequest('GetVersions');
        return data;
    } catch (error) {
        console.error('獲取版本列表失敗:', error.message);
        throw error;
    }
}

// 解析經文回應並提取Strong's numbers
function parseVerseResponse(apiResponse, bookName, chapter, verse) {
    try {
        console.log('解析經文回應...');
        console.log('API端點:', apiResponse.endpoint);
        
        const data = apiResponse.data;
        let verseText = '';
        let strongsNumbers = [];
        
        if (!data) {
            console.log('API回應為空');
            return null;
        }
        
        switch (apiResponse.endpoint) {
            case 'GetVerse':
                if (Array.isArray(data) && data.length > 0) {
                    const verseData = data[0];
                    verseText = verseData.t || verseData.text || verseData.verseText || '';
                } else if (typeof data === 'object' && data.t) {
                    verseText = data.t || data.text || '';
                } else if (typeof data === 'string') {
                    verseText = data;
                }
                break;
                
            case 'GetChapter':
                if (Array.isArray(data)) {
                    if (verse) {
                        // 查找特定經節
                        const targetVerse = data.find(v => 
                            (v.v == verse) || (v.verse == verse) || (v.verseNumber == verse)
                        );
                        if (targetVerse) {
                            verseText = targetVerse.t || targetVerse.text || targetVerse.verseText || '';
                        }
                    } else {
                        // 返回整章，限制長度
                        const verses = data.slice(0, 10); // 限制顯示前10節避免過長
                        verseText = verses.map(v => {
                            const verseNum = v.v || v.verse || v.verseNumber || '';
                            const text = v.t || v.text || v.verseText || '';
                            return `${verseNum}. ${text}`;
                        }).join('\n');
                        
                        if (data.length > 10) {
                            verseText += `\n\n...(還有 ${data.length - 10} 節，請查詢特定經節)`;
                        }
                    }
                }
                break;
                
            default:
                if (typeof data === 'string') {
                    verseText = data;
                } else if (data && data.text) {
                    verseText = data.text;
                } else if (Array.isArray(data) && data.length > 0) {
                    verseText = data[0].text || data[0].t || JSON.stringify(data[0]);
                }
        }
        
        // 清理經文文本
        verseText = verseText.trim();
        
        // 限制長度
        if (verseText.length > 1500) {
            verseText = verseText.slice(0, 1500) + '...';
        }
        
        console.log('解析結果:', { 
            textLength: verseText.length, 
            strongsCount: strongsNumbers.length,
            preview: verseText.slice(0, 100)
        });
        
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
        console.error('解析經文回應時發生錯誤:', error);
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
        
        let chineseData = null;
        let originalData = null;
        let strongsNumbers = [];
        
        if (parsed.verse) {
            // 單節查詢
            console.log('開始查詢單節經文...');
            
            // 1. 獲取中文經文
            try {
                chineseData = await getChineseVerse(parsed.book, parsed.chapter, parsed.verse);
                console.log('成功獲取中文經文');
            } catch (error) {
                console.log('中文經文獲取失敗:', error.message);
            }
            
            // 2. 獲取原文數據（用於Strong's編號）
            try {
                originalData = await getOriginalText(parsed.book, parsed.chapter, parsed.verse);
                if (originalData && originalData.data && Array.isArray(originalData.data) && originalData.data.length > 0) {
                    console.log('成功獲取原文數據，包含', originalData.data.length, '個詞彙');
                    
                    // 提取Strong's編號
                    strongsNumbers = originalData.data
                        .filter(wordData => wordData.strongs)
                        .map((wordData, index) => ({
                            number: wordData.strongs,
                            word: wordData.word || '',
                            glossary: wordData.glossary || '',
                            pronunciation: wordData.pronun ? JSON.parse(wordData.pronun).dic || '' : '',
                            emoji: index < NUMBER_EMOJIS.length ? 
                                NUMBER_EMOJIS[index] : 
                                EXTENDED_EMOJIS[index - NUMBER_EMOJIS.length] || '❓'
                        }))
                        .slice(0, 20); // 限制數量
                    
                    console.log('提取到', strongsNumbers.length, '個Strong\'s編號');
                } else {
                    console.log('原文數據為空或格式不正確');
                }
            } catch (error) {
                console.log('原文數據獲取失敗:', error.message);
            }
        } else {
            // 整章查詢
            console.log('開始查詢整章經文...');
            try {
                chineseData = await getChineseChapter(parsed.book, parsed.chapter);
                console.log('成功獲取中文整章');
            } catch (error) {
                console.log('中文整章獲取失敗:', error.message);
            }
        }
        
        // 如果沒有中文數據，嘗試英文版本作為後備
        if (!chineseData) {
            console.log('使用英文版本作為後備');
            if (parsed.verse) {
                chineseData = await getVerse(parsed.book, parsed.chapter, parsed.verse);
            } else {
                chineseData = await getChapter(parsed.book, parsed.chapter);
            }
        }
        
        if (!chineseData || !chineseData.data) {
            await message.reply('❌ 找不到指定的經文，請檢查書卷名稱和章節是否正確。');
            return;
        }
        
        // 解析中文經文
        const formatted = parseVerseResponse(chineseData, parsed.bookName, parsed.chapter, parsed.verse);
        
        if (!formatted || !formatted.record || formatted.record.length === 0) {
            await message.reply('❌ 經文解析失敗，請稍後再試。');
            return;
        }
        
        // 如果有原文數據的Strong's編號，覆蓋解析結果中的strongs
        if (strongsNumbers.length > 0) {
            formatted.strongs = strongsNumbers;
            console.log('使用原文數據的Strong\'s編號:', strongsNumbers.length, '個');
        }
        
        const record = formatted.record[0];
        let responseText = `**${parsed.bookName} ${record.chapter}${record.verse ? ':' + record.verse : ''}**`;
        
        if (record.text && record.text.trim() && record.text !== '解析失敗，請稍後再試') {
            responseText += `\n\n${record.text}`;
        } else {
            responseText += '\n\n⚠️ 經文內容獲取失敗，請稍後再試';
        }
        
        // 如果有Strong's numbers，添加提示
        if (formatted.strongs && formatted.strongs.length > 0) {
            responseText += '\n\n🔍 *點擊下方表情符號查看原文字義*';
        }
        
        // 添加版本資訊
        if (chineseData.version) {
            responseText += `\n\n*版本: ${chineseData.version.toUpperCase()}*`;
        } else {
            responseText += '\n\n*版本: 中文和合本*';
        }
        
        // 確保訊息長度不超過Discord限制
        if (responseText.length > 1800) {
            responseText = responseText.slice(0, 1800) + '...\n\n*(內容過長，已截斷)*';
        }
        
        const sentMessage = await message.reply(responseText);
        console.log('訊息已發送，ID:', sentMessage.id);
        
        // 如果有Strong's numbers，添加表情符號反應
        if (formatted.strongs && formatted.strongs.length > 0) {
            console.log('開始添加表情符號反應...');
            messageStrongsMap.set(sentMessage.id, formatted.strongs);
            
            for (let i = 0; i < formatted.strongs.length; i++) {
                const strong = formatted.strongs[i];
                try {
                    await sentMessage.react(strong.emoji);
                    console.log(`添加表情符號: ${strong.emoji} for ${strong.number}`);
                } catch (error) {
                    console.error(`添加表情符號 ${strong.emoji} 失敗:`, error);
                }
            }
            
            // 30分鐘後清理映射
            setTimeout(() => {
                messageStrongsMap.delete(sentMessage.id);
                console.log(`清理訊息 ${sentMessage.id} 的映射`);
            }, 1800000);
        }
        
    } catch (error) {
        console.error('處理聖經查詢時發生錯誤:', error);
        
        let errorMessage = '❌ 查詢經文時發生錯誤';
        
        if (error.message.includes('4000 or fewer in length')) {
            errorMessage = '❌ 查詢結果過長，請嘗試查詢單節經文';
        } else if (error.message.includes('404')) {
            errorMessage = '❌ 找不到指定的經文，請檢查書卷名稱和章節';
        } else if (error.message.includes('timeout')) {
            errorMessage = '❌ API請求超時，請稍後再試';
        } else if (error.response?.status === 429) {
            errorMessage = '❌ API請求過於頻繁，請稍後再試';
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
• \`太1:1\` - 查詢單節（繁體中文和合本 + Strong's編號）
• \`馬太福音1:1\` - 完整書名  
• \`詩23\` - 查詢整章（繁體中文和合本）
• \`約3:16\` - 任何書卷

**功能特色：**
• 📜 **繁體中文和合本** - 主要顯示版本
• 🔤 **原文研讀** - 希伯來文/希臘文 Strong's 編號
• 🎯 **互動查詢** - 點擊表情符號查看原文字義
• 📚 **完整字典** - 包含發音、詞性、字義解釋

**其他指令：**
• \`!books\` - 顯示書卷列表
• \`!versions\` - 顯示可用版本
• \`!endpoints\` - 顯示可用API端點
• \`!test\` - 測試機器人
• \`!testapi\` - 測試API連接
• \`!debug\` - 調試API參數
• \`!random\` - 隨機經文
• \`!help\` - 顯示此說明

**💡 提示：** 查詢單節經文時會自動提供 Strong's 編號功能！`);
            
        } else if (command === 'books') {
            const books = getBooksList();
            await message.reply(`📚 **聖經書卷列表**

**📜 舊約：** ${books.oldTestament}

**✨ 新約：** ${books.newTestament}`);
            
        } else if (command === 'debug') {
            try {
                await message.reply('🔍 **調試 API 參數和回應...**');
                
                // 測試不同的書卷名稱格式
                console.log('=== 調試書卷名稱格式 ===');
                const testBookFormats = [
                    'Genesis', 'genesis', 'GENESIS',
                    'Matthew', 'matthew', 'MATTHEW',
                    'John', 'john', 'JOHN',
                    '1', '40', '43'  // 嘗試直接用數字
                ];
                
                let bookDebugInfo = '**書卷名稱格式測試:**\n\n';
                
                for (const book of testBookFormats) {
                    try {
                        const bookId = await makeAPIRequest('GetBookIdByBookName', { bookName: book });
                        bookDebugInfo += `• ${book}: ${JSON.stringify(bookId)}\n`;
                    } catch (error) {
                        bookDebugInfo += `• ${book}: 錯誤 - ${error.message}\n`;
                    }
                }
                
                await message.reply(bookDebugInfo);
                
                // 測試不同的 verseId 格式
                console.log('=== 調試 verseId 格式 ===');
                const testVerseFormats = [
                    { verseId: '01001001' },  // 8位格式
                    { verseId: '1001001' },   // 7位格式
                    { verseId: '1-1-1' },     // 破折號格式
                    { verseId: '1.1.1' },     // 點號格式
                    { verseId: 'Genesis.1.1' }, // 名稱格式
                    { verseId: '40001001' },  // Matthew 1:1
                    { verseId: '01001001', version: 'kjv' },
                    { verseId: '01001001', versionId: 'kjv' }
                ];
                
                let verseDebugInfo = '**verseId 格式測試:**\n\n';
                
                for (const params of testVerseFormats) {
                    try {
                        const result = await makeAPIRequest('GetVerse', params);
                        verseDebugInfo += `• ${JSON.stringify(params)}: ${typeof result} - ${JSON.stringify(result).slice(0, 50)}...\n\n`;
                    } catch (error) {
                        verseDebugInfo += `• ${JSON.stringify(params)}: 錯誤 - ${error.message}\n\n`;
                    }
                }
                
                await message.reply(verseDebugInfo);
                
                // 測試 GetChapter 的不同參數格式
                console.log('=== 調試 GetChapter 格式 ===');
                const testChapterFormats = [
                    { chapterId: '01001' },
                    { chapterId: '1001' },
                    { chapterId: '001001' },
                    { bookId: '01', chapterId: '01', versionId: 'kjv' },
                    { bookId: '1', chapterId: '1', versionId: 'kjv' },
                    { bookAndChapterId: '1.1' },
                    { bookAndChapterId: '01.01' }
                ];
                
                let chapterDebugInfo = '**GetChapter 格式測試:**\n\n';
                
                for (const params of testChapterFormats) {
                    try {
                        const endpoint = params.bookAndChapterId ? 'GetChapterByBookAndChapterId' : 'GetChapter';
                        const result = await makeAPIRequest(endpoint, params);
                        chapterDebugInfo += `• ${endpoint} ${JSON.stringify(params)}: ${typeof result} - 長度${Array.isArray(result) ? result.length : 'N/A'}\n\n`;
                    } catch (error) {
                        chapterDebugInfo += `• ${JSON.stringify(params)}: 錯誤 - ${error.message}\n\n`;
                    }
                }
                
                await message.reply(chapterDebugInfo);
                
            } catch (error) {
                await message.reply(`❌ 調試失敗：${error.message}`);
            }
            
        } else if (command === 'versions') {
            try {
                await message.reply('🔍 **查詢可用的聖經版本...**');
                
                const versions = await getBibleVersions();
                
                let versionList = '📚 **可用的聖經版本：**\n\n';
                
                if (Array.isArray(versions)) {
                    versions.forEach(version => {
                        if (typeof version === 'object') {
                            const id = version.id || version.versionId || version.abbreviation || version.code;
                            const name = version.name || version.fullName || version.title || version.description;
                            const lang = version.language || version.lang || '';
                            versionList += `• **${id}** - ${name} ${lang ? `(${lang})` : ''}\n`;
                        } else {
                            versionList += `• ${version}\n`;
                        }
                    });
                } else if (typeof versions === 'object') {
                    Object.keys(versions).forEach(key => {
                        versionList += `• **${key}** - ${versions[key]}\n`;
                    });
                } else {
                    versionList += '未能解析版本資訊';
                }
                
                // 分批發送以避免超長
                if (versionList.length > 1800) {
                    const parts = versionList.match(/.{1,1800}/g);
                    for (let i = 0; i < parts.length; i++) {
                        await message.reply(parts[i]);
                    }
                } else {
                    await message.reply(versionList);
                }
                
            } catch (error) {
                await message.reply(`❌ 獲取版本列表失敗：${error.message}`);
            }
            
        } else if (command === 'endpoints') {
            const endpointList = `🔧 **IQ Bible API 可用端點：**

**📖 經文查詢：**
• GetVerse - 取得單節經文
• GetChapter - 取得整章經文
• GetChapterByBookAndChapterId - 依書卷章節ID取得整章

**🔤 原文研究：**
• GetOriginalText - 取得原文文本 (含Strong's)
• GetStrongs - Strong's編號字典
• GetGreekCharactersAndUnicode - 希臘文字符
• GetHebrewCharactersAndUnicodePoints - 希伯來文字符

**📚 書卷資訊：**
• GetBooks - 所有書卷
• GetBooksOT - 舊約書卷
• GetBooksNT - 新約書卷
• GetBookIdByBookName - 依書名取得ID

**🔍 研讀工具：**
• GetCommentary - 註釋
• GetCrossReferences - 交叉引用
• GetWordsOfJesus - 耶穌的話
• GetParables - 比喻
• GetStories - 故事

**🎲 其他功能：**
• GetRandomVerse - 隨機經文
• GetSearch - 搜尋經文
• GetVersions - 聖經版本列表`;
            
            await message.reply(endpointList);
            
        } else if (command === 'test') {
            await message.reply('✅ 聖經機器人正常運作中！\n使用IQ Bible API\n試試輸入：太1:1');
            
        } else if (command === 'ping') {
            await message.reply('🏓 Pong! 機器人正在運行中...');
            
        } else if (command === 'testapi') {
            try {
                await message.reply('🔍 **測試IQ Bible API連接...**');
                
                const data = await getVerse('Matthew', 1, 1);
                
                let result = '✅ **IQ Bible API 連接成功！**\n\n';
                result += `**測試查詢:** Matthew 1:1\n`;
                result += `**API端點:** ${data.endpoint}\n`;
                result += `**回應預覽:** ${JSON.stringify(data.data).slice(0, 200)}...\n\n`;
                result += '**狀態:** API正常運作';
                
                await message.reply(result);
                
            } catch (error) {
                await message.reply(`❌ **IQ Bible API 測試失敗**\n\n**錯誤:** ${error.message}\n\n請檢查API密鑰是否正確設置`);
            }
            
        } else if (command === 'random') {
            try {
                await message.reply('🎲 **取得隨機經文...**');
                
                const randomVerse = await makeAPIRequest('GetRandomVerse');
                
                if (randomVerse) {
                    let responseText = '🎲 **今日隨機經文**\n\n';
                    
                    if (randomVerse.reference) {
                        responseText += `**${randomVerse.reference}**\n\n`;
                    }
                    
                    if (randomVerse.text || randomVerse.verse) {
                        responseText += `${randomVerse.text || randomVerse.verse}`;
                    } else {
                        responseText += JSON.stringify(randomVerse);
                    }
                    
                    await message.reply(responseText);
                } else {
                    await message.reply('❌ 無法取得隨機經文');
                }
                
            } catch (error) {
                await message.reply(`❌ 取得隨機經文失敗：${error.message}`);
            }
            
        } else if (command === 'testchinese') {
            try {
                await message.reply('🔍 **測試中文版本查詢...**');
                
                // 測試所有可能的中文版本名稱
                const chineseVersions = [
                    'cuv', 'cuvs', 'cuvt', 'chinese', 'cht', 'chs',
                    'chinese_union', 'chinese_traditional', 'chinese_simplified',
                    'union', 'cun', 'cnv', 'ccb', 'cbb', 'csb',
                    'zh', 'zh-tw', 'zh-cn', 'chinese_union_version'
                ];
                
                let testResult = '**中文版本測試結果:**\n\n';
                
                for (const version of chineseVersions) {
                    try {
                        const result = await makeAPIRequest('GetVerse', { 
                            verseId: '01001001',
                            version: version
                        });
                        
                        if (result && result !== false && result !== null) {
                            testResult += `✅ **${version}**: 成功 - ${JSON.stringify(result).slice(0, 100)}...\n\n`;
                        } else {
                            testResult += `❌ **${version}**: 返回 ${result}\n\n`;
                        }
                    } catch (error) {
                        testResult += `❌ **${version}**: 錯誤 - ${error.message}\n\n`;
                    }
                    
                    // 分批發送避免過長
                    if (testResult.length > 1500) {
                        await message.reply(testResult);
                        testResult = '';
                    }
                }
                
                if (testResult) {
                    await message.reply(testResult);
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
    
    // 檢查是否為聖經引用格式
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
                    
                    // 添加使用次數等額外資訊
                    if (strongsData.frequency || strongsData.count) {
                        embed.addFields({ 
                            name: '📊 出現次數', 
                            value: `${strongsData.frequency || strongsData.count} 次`, 
                            inline: true 
                        });
                    }
                    
                    embed.setFooter({ text: '資料來源：IQ Bible API' });
                    
                    await reaction.message.reply({ embeds: [embed] });
                } else {
                    // 如果API沒有返回數據，但我們有本地的glossary數據
                    if (selectedStrong.glossary) {
                        const embed = new EmbedBuilder()
                            .setTitle(`📖 原文編號：${selectedStrong.number}`)
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
                        
                        // 提取詳細定義
                        const definitionLines = lines.slice(1, -2); // 排除第一行和最後的KJV行
                        if (definitionLines.length > 0) {
                            const definition = definitionLines.join(' ').slice(0, 1024);
                            embed.addFields({ 
                                name: '📚 詳細解釋', 
                                value: definition
                            });
                        }
                        
                        embed.setFooter({ text: '資料來源：IQ Bible API 原文數據' });
                        
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
                
                const embed = new EmbedBuilder()
                    .setTitle(`📖 原文編號：${selectedStrong.number}`)
                    .setColor(0xff0000)
                    .addFields(
                        { 
                            name: '❌ 錯誤', 
                            value: `查詢時發生錯誤：${error.message}` 
                        }
                    );
                
                if (selectedStrong.word) {
                    embed.addFields({ 
                        name: '🎯 經文中的用法', 
                        value: selectedStrong.word
                    });
                }
                
                embed.setFooter({ text: '請稍後再試' });
                
                await reaction.message.reply({ embeds: [embed] });
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
if (!DISCORD_TOKEN) {
    console.error('❌ 錯誤：未設置 DISCORD_TOKEN 環境變數');
    process.exit(1);
}

client.login(DISCORD_TOKEN).catch(error => {
    console.error('❌ Discord 登入失敗:', error);
    process.exit(1);
});
