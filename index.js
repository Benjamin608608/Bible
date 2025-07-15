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

// 聖經書卷中文對應表
const BIBLE_BOOKS = {
    // 舊約
    '創世記': '創', '創': '創',
    '出埃及記': '出', '出': '出',
    '利未記': '利', '利': '利',
    '民數記': '民', '民': '民',
    '申命記': '申', '申': '申',
    '約書亞記': '書', '書': '書',
    '士師記': '士', '士': '士',
    '路得記': '得', '得': '得',
    '撒母耳記上': '撒上', '撒上': '撒上',
    '撒母耳記下': '撒下', '撒下': '撒下',
    '列王紀上': '王上', '王上': '王上',
    '列王紀下': '王下', '王下': '王下',
    '歷代志上': '代上', '代上': '代上',
    '歷代志下': '代下', '代下': '代下',
    '以斯拉記': '拉', '拉': '拉',
    '尼希米記': '尼', '尼': '尼',
    '以斯帖記': '斯', '斯': '斯',
    '約伯記': '伯', '伯': '伯',
    '詩篇': '詩', '詩': '詩',
    '箴言': '箴', '箴': '箴',
    '傳道書': '傳', '傳': '傳',
    '雅歌': '歌', '歌': '歌',
    '以賽亞書': '賽', '賽': '賽',
    '耶利米書': '耶', '耶': '耶',
    '耶利米哀歌': '哀', '哀': '哀',
    '以西結書': '結', '結': '結',
    '但以理書': '但', '但': '但',
    '何西阿書': '何', '何': '何',
    '約珥書': '珥', '珥': '珥',
    '阿摩司書': '摩', '摩': '摩',
    '俄巴底亞書': '俄', '俄': '俄',
    '約拿書': '拿', '拿': '拿',
    '彌迦書': '彌', '彌': '彌',
    '那鴻書': '鴻', '鴻': '鴻',
    '哈巴谷書': '哈', '哈': '哈',
    '西番雅書': '番', '番': '番',
    '哈該書': '該', '該': '該',
    '撒迦利亞書': '亞', '亞': '亞',
    '瑪拉基書': '瑪', '瑪': '瑪',
    
    // 新約
    '馬太福音': '太', '太': '太',
    '馬可福音': '可', '可': '可',
    '路加福音': '路', '路': '路',
    '約翰福音': '約', '約': '約',
    '使徒行傳': '徒', '徒': '徒',
    '羅馬書': '羅', '羅': '羅',
    '哥林多前書': '林前', '林前': '林前',
    '哥林多後書': '林後', '林後': '林後',
    '加拉太書': '加', '加': '加',
    '以弗所書': '弗', '弗': '弗',
    '腓立比書': '腓', '腓': '腓',
    '歌羅西書': '西', '西': '西',
    '帖撒羅尼迦前書': '帖前', '帖前': '帖前',
    '帖撒羅尼迦後書': '帖後', '帖後': '帖後',
    '提摩太前書': '提前', '提前': '提前',
    '提摩太後書': '提後', '提後': '提後',
    '提多書': '多', '多': '多',
    '腓利門書': '門', '門': '門',
    '希伯來書': '來', '來': '來',
    '雅各書': '雅', '雅': '雅',
    '彼得前書': '彼前', '彼前': '彼前',
    '彼得後書': '彼後', '彼後': '彼後',
    '約翰一書': '約一', '約一': '約一',
    '約翰二書': '約二', '約二': '約二',
    '約翰三書': '約三', '約三': '約三',
    '猶大書': '猶', '猶': '猶',
    '啟示錄': '啟', '啟': '啟'
};

// 轉義正則表達式特殊字符的函數
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
            
            const bookCode = BIBLE_BOOKS[bookName];
            if (bookCode) {
                return {
                    book: bookCode,
                    bookName: bookName,
                    chapter: chapter,
                    verse: verse
                };
            }
        }
    }
    
    return null;
}

// 從IQ Bible API獲取經文（包含Strong's number）
async function getBibleVerse(bookCode, chapter, verse = null, version = 'cuvs') {
    try {
        // 構建API請求
        let endpoint = `https://iq-bible.p.rapidapi.com/GetSemanticRelationsAllWords`;
        
        const params = {
            book: bookCode,
            chapter: chapter.toString()
        };
        
        if (verse) {
            params.verse = verse.toString();
        }
        
        console.log('請求IQ Bible API:', endpoint, params);
        
        const response = await axios.get(endpoint, {
            params: params,
            timeout: 10000,
            headers: {
                'X-RapidAPI-Host': 'iq-bible.p.rapidapi.com',
                'X-RapidAPI-Key': IQ_BIBLE_API_KEY,
                'Accept': 'application/json'
            }
        });
        
        console.log('IQ Bible API回應狀態:', response.status);
        console.log('IQ Bible API回應內容:', JSON.stringify(response.data, null, 2));
        
        return response.data;
    } catch (error) {
        console.error('獲取經文時發生錯誤:', error.message);
        if (error.response) {
            console.error('錯誤詳情:', error.response.data);
        }
        
        // 如果IQ Bible API失敗，退回到信望愛API
        console.log('退回到信望愛API...');
        return await getFallbackBibleVerse(bookCode, chapter, verse);
    }
}

// 備用的信望愛API（保持原有功能）
async function getFallbackBibleVerse(bookCode, chapter, verse = null, version = 'unv') {
    try {
        const params = {
            chineses: bookCode,
            chap: chapter,
            version: version,
            gb: 0,
            strong: 1
        };
        
        if (verse) {
            params.sec = verse;
        }
        
        const url = 'https://bible.fhl.net/json/qb.php';
        console.log('請求備用聖經API:', url, params);
        
        const response = await axios.get(url, { 
            params,
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Bible Discord Bot)'
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('備用API也失敗:', error.message);
        throw error;
    }
}

// 獲取Strong's number詳細資料（使用IQ Bible API）
async function getStrongsData(strongNumber) {
    try {
        console.log('查詢Strong\'s number:', strongNumber);
        
        // 清理Strong's number格式
        let cleanNumber = strongNumber.replace(/^(WAH|WHO|WTH|WG|H|G)/, '');
        
        // 判斷是希伯來文還是希臘文
        const isHebrew = strongNumber.startsWith('WAH') || strongNumber.startsWith('WHO') || strongNumber.startsWith('H');
        const prefix = isHebrew ? 'H' : 'G';
        const standardNumber = prefix + cleanNumber;
        
        console.log(`轉換 ${strongNumber} -> ${standardNumber}`);
        
        // 嘗試不同的IQ Bible API端點
        const endpoints = [
            `https://iq-bible.p.rapidapi.com/GetStrongsDefinition`,
            `https://iq-bible.p.rapidapi.com/GetStrongsData`,
            `https://iq-bible.p.rapidapi.com/GetWordDefinition`
        ];
        
        for (const endpoint of endpoints) {
            try {
                console.log(`嘗試端點: ${endpoint}`);
                
                const response = await axios.get(endpoint, {
                    params: {
                        strong: standardNumber,
                        number: cleanNumber,
                        strongsNumber: standardNumber
                    },
                    timeout: 10000,
                    headers: {
                        'X-RapidAPI-Host': 'iq-bible.p.rapidapi.com',
                        'X-RapidAPI-Key': IQ_BIBLE_API_KEY,
                        'Accept': 'application/json'
                    }
                });
                
                console.log(`${endpoint} 回應:`, JSON.stringify(response.data, null, 2));
                
                if (response.data && (response.data.definition || response.data.meaning || response.data.word)) {
                    return response.data;
                }
            } catch (error) {
                console.log(`${endpoint} 失敗:`, error.message);
                continue;
            }
        }
        
        console.log('所有IQ Bible端點都未返回資料');
        return null;
    } catch (error) {
        console.error('獲取Strong\'s資料時發生錯誤:', error.message);
        throw error;
    }
}

// 解析Strong's number並添加編號
function parseStrongsNumbers(text) {
    if (!text) return { text: text, strongs: [] };
    
    console.log('原始經文文本:', text);
    
    // 更廣泛的匹配模式
    const strongsPattern = /<([A-Z]*\w*\d+)>/g;
    const strongs = [];
    const strongsMap = new Map();
    let counter = 1;
    
    // 重置正則表達式
    strongsPattern.lastIndex = 0;
    
    let match;
    while ((match = strongsPattern.exec(text)) !== null) {
        const strongNumber = match[1];
        console.log('找到Strong\'s number:', strongNumber);
        
        if (!strongsMap.has(strongNumber)) {
            strongsMap.set(strongNumber, counter);
            strongs.push({
                number: strongNumber,
                index: counter,
                emoji: counter <= 10 ? NUMBER_EMOJIS[counter - 1] : EXTENDED_EMOJIS[counter - 11]
            });
            counter++;
        }
    }
    
    console.log('解析到的Strong\'s numbers:', strongs);
    
    // 替換文本中的Strong's number為上標數字
    let processedText = text;
    
    for (const [strongNumber, index] of strongsMap) {
        const escapedNumber = escapeRegExp(strongNumber);
        const pattern = '<' + escapedNumber + '>';
        const regex = new RegExp(pattern, 'g');
        const superscript = ' ' + toSuperscript(index);
        
        processedText = processedText.replace(regex, superscript);
        console.log('替換', pattern, '為', superscript);
    }
    
    // 清理剩餘的特殊符號
    processedText = processedText.replace(/[{}^]/g, '');
    
    console.log('處理後的文本:', processedText);
    
    return { text: processedText, strongs: strongs };
}

// 格式化經文輸出（包含Strong's number）
function formatBibleText(data) {
    if (!data || !data.record || data.record.length === 0) {
        return null;
    }
    
    let allStrongs = [];
    let formattedText = '';
    
    console.log('開始格式化經文，記錄數量:', data.record.length);
    
    if (data.record.length > 1) {
        // 多節經文
        let allText = '';
        data.record.forEach(verse => {
            allText += verse.bible_text + ' ';
        });
        
        const globalParsed = parseStrongsNumbers(allText);
        const globalStrongsMap = new Map();
        globalParsed.strongs.forEach(strong => {
            globalStrongsMap.set(strong.number, strong.index);
        });
        
        data.record.forEach(verse => {
            const verseText = verse.bible_text;
            let processedVerseText = verseText;
            
            for (const [strongNumber, index] of globalStrongsMap) {
                const escapedNumber = escapeRegExp(strongNumber);
                const pattern = '<' + escapedNumber + '>';
                const regex = new RegExp(pattern, 'g');
                const superscript = ' ' + toSuperscript(index);
                
                processedVerseText = processedVerseText.replace(regex, superscript);
            }
            
            processedVerseText = processedVerseText.replace(/[{}^]/g, '');
            formattedText += `**${verse.chineses} ${verse.chap}:${verse.sec}** ${processedVerseText}\n\n`;
        });
        
        allStrongs = globalParsed.strongs;
    } else {
        // 單節經文
        const verse = data.record[0];
        console.log('處理單節經文:', verse.bible_text);
        const parsed = parseStrongsNumbers(verse.bible_text);
        formattedText = `**${verse.chineses} ${verse.chap}:${verse.sec}** ${parsed.text}`;
        allStrongs = parsed.strongs;
    }
    
    console.log('最終Strong\'s numbers:', allStrongs);
    
    return {
        text: formattedText,
        strongs: allStrongs
    };
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
        const formatted = formatBibleText(data);
        
        if (!formatted) {
            await message.reply('❌ 找不到指定的經文，請檢查書卷名稱和章節是否正確。');
            return;
        }
        
        let responseText = formatted.text;
        
        const sentMessage = await message.reply(responseText);
        console.log('訊息已發送，ID:', sentMessage.id);
        
        if (formatted.strongs.length > 0) {
            console.log('開始添加表情符號反應...');
            messageStrongsMap.set(sentMessage.id, formatted.strongs);
            
            for (const strong of formatted.strongs) {
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
        await message.reply('❌ 查詢經文時發生錯誤，請稍後再試。');
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
    console.log('機器人啟動成功，可在任何頻道使用！');
});

// 訊息事件監聽器
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    const content = message.content.trim();
    
    if (content.startsWith('!')) {
        const command = content.slice(1).toLowerCase();
        
        if (command === 'bible' || command === 'help') {
            await message.reply(`📖 **聖經機器人使用說明**
直接輸入經文引用來查詢聖經經文，並顯示原文編號

**支援格式：**
• \`太1:1\` - 查詢單節
• \`馬太福音1:1\` - 完整書名  
• \`詩23\` - 查詢整章
• \`約3:16\` - 任何書卷

**新功能：**
• 經文中的小數字代表原文編號
• 點擊表情符號查看原文詳細資料

**其他指令：**
• \`!books\` - 顯示書卷列表
• \`!test\` - 測試機器人
• \`!help\` - 顯示此說明`);
            
        } else if (command === 'books') {
            const books = getBooksList();
            await message.reply(`📚 **聖經書卷列表**

**📜 舊約：** ${books.oldTestament}

**✨ 新約：** ${books.newTestament}`);
            
        } else if (command === 'test') {
            await message.reply('✅ 聖經機器人正常運作中！試試輸入：太1:1');
        } else if (command === 'testapi') {
            // 測試IQ Bible API
            try {
                await message.reply('🔍 **測試IQ Bible API...**');
                
                // 測試基本API端點
                const response = await axios.get('https://iq-bible.p.rapidapi.com/GetSemanticRelationsAllWords', {
                    params: {
                        book: 'Genesis',
                        chapter: '1',
                        verse: '1'
                    },
                    timeout: 10000,
                    headers: {
                        'X-RapidAPI-Host': 'iq-bible.p.rapidapi.com',
                        'X-RapidAPI-Key': IQ_BIBLE_API_KEY,
                        'Accept': 'application/json'
                    }
                });
                
                if (response.data) {
                    let result = '✅ **IQ Bible API 連接成功！**\n\n';
                    result += `**測試經文:** Genesis 1:1\n`;
                    result += `**API回應:** ${JSON.stringify(response.data).slice(0, 500)}...\n\n`;
                    result += '**結論:** 新API可正常使用，正在整合中...';
                    
                    await message.reply(result);
                } else {
                    await message.reply('❌ IQ Bible API無回應');
                }
                
            } catch (error) {
                await message.reply(`❌ IQ Bible API測試失敗：${error.message}\n\n**錯誤詳情:** ${error.response ? JSON.stringify(error.response.data) : '無詳情'}`);
            }
        } else if (command === 'teststrong') {
            // 測試Strong's number查詢
            try {
                await message.reply('🔍 **測試IQ Bible Strong\'s查詢...**');
                
                const testNumbers = ['H430', 'G2316', 'H7225', 'G25'];
                let results = '📖 **Strong\'s Number 測試結果：**\n\n';
                
                for (const strongNumber of testNumbers) {
                    try {
                        const data = await getStrongsData(strongNumber);
                        if (data) {
                            results += `**${strongNumber}:** ✅ 找到資料\n`;
                            if (data.definition) results += `定義: ${data.definition.slice(0, 100)}...\n`;
                            if (data.original) results += `原文: ${data.original}\n`;
                        } else {
                            results += `**${strongNumber}:** ❌ 無資料\n`;
                        }
                        results += '\n';
                    } catch (error) {
                        results += `**${strongNumber}:** ❌ 錯誤 - ${error.message}\n\n`;
                    }
                }
                
                await message.reply(results);
                
            } catch (error) {
                await message.reply(`❌ Strong's測試失敗：${error.message}`);
            }
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
                
                if (strongsData && (strongsData.definition || strongsData.meaning || strongsData.word || strongsData.original)) {
                    console.log('獲取到的Strong\'s資料:', strongsData);
                    
                    const embed = new EmbedBuilder()
                        .setTitle(`📖 原文編號：${selectedStrong.number}`)
                        .setColor(0x0099ff);
                    
                    let hasContent = false;
                    
                    // 原文 - IQ Bible API字段
                    if (strongsData.original || strongsData.word || strongsData.hebrew || strongsData.greek) {
                        const originalText = strongsData.original || strongsData.word || strongsData.hebrew || strongsData.greek;
                        embed.addFields({ 
                            name: '📜 原文', 
                            value: originalText, 
                            inline: true 
                        });
                        hasContent = true;
                    }
                    
                    // 音譯
                    if (strongsData.transliteration || strongsData.pronunciation) {
                        embed.addFields({ 
                            name: '🔤 音譯', 
                            value: strongsData.transliteration || strongsData.pronunciation, 
                            inline: true 
                        });
                        hasContent = true;
                    }
                    
                    // 詞性
                    if (strongsData.partOfSpeech || strongsData.grammar || strongsData.type) {
                        embed.addFields({ 
                            name: '📝 詞性', 
                            value: strongsData.partOfSpeech || strongsData.grammar || strongsData.type, 
                            inline: true 
                        });
                        hasContent = true;
                    }
                    
                    // 字義解釋
                    if (strongsData.definition || strongsData.meaning || strongsData.description) {
                        const definition = strongsData.definition || strongsData.meaning || strongsData.description;
                        embed.addFields({ 
                            name: '💭 字義解釋', 
                            value: definition.slice(0, 1024) // Discord限制
                        });
                        hasContent = true;
                    }
                    
                    // 使用次數
                    if (strongsData.frequency || strongsData.occurrences) {
                        embed.addFields({ 
                            name: '📊 出現次數', 
                            value: `${strongsData.frequency || strongsData.occurrences} 次`, 
                            inline: true 
                        });
                        hasContent = true;
                    }
                    
                    // 如果沒有標準字段，顯示所有可用數據
                    if (!hasContent) {
                        console.log('沒有標準欄位，顯示所有可用資料...');
                        Object.keys(strongsData).forEach(key => {
                            if (strongsData[key] && typeof strongsData[key] === 'string' && strongsData[key].trim() !== '') {
                                embed.addFields({ 
                                    name: `📋 ${key}`, 
                                    value: strongsData[key].slice(0, 1024),
                                    inline: true 
                                });
                                hasContent = true;
                            }
                        });
                    }
                    
                    if (!hasContent) {
                        embed.addFields({ 
                            name: '⚠️ 資料狀態', 
                            value: '此編號已識別，但詳細資料格式需要調整' 
                        });
                    }
                    
                    embed.setFooter({ text: '資料來源：IQ Bible API' });
                    
                    await reaction.message.reply({ embeds: [embed] });
                } else {
                    console.log('未找到Strong\'s資料或資料為空');
                    
                    // 直接提供簡化的編號說明
                    const embed = new EmbedBuilder()
                        .setTitle(`📖 原文編號：${selectedStrong.number}`)
                        .setColor(0x0099ff)
                        .addFields(
                            { 
                                name: '📋 編號說明', 
                                value: '此為聖經原文標記編號' 
                            },
                            { 
                                name: '🎯 功能', 
                                value: '標示經文中每個詞彙的原文位置，助於原文研讀' 
                            },
                            { 
                                name: '💡 說明', 
                                value: '正在嘗試從新的API獲取詳細字典內容，如果暫時無法顯示，請稍後再試。' 
                            }
                        )
                        .setFooter({ text: '資料來源：IQ Bible API' });
                    
                    await reaction.message.reply({ embeds: [embed] });
                }
            } catch (error) {
                console.error('獲取Strong\'s資料時發生錯誤:', error);
                await reaction.message.reply(`❌ 查詢 ${selectedStrong.number} 時發生錯誤：${error.message}

這可能是網路問題或API暫時無法使用，請稍後再試。`);
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
