const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');

// 環境變數設定
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

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

// 從信望愛站API獲取經文（包含Strong's number）
async function getBibleVerse(bookCode, chapter, verse = null, version = 'unv') {
    try {
        const params = {
            chineses: bookCode,
            chap: chapter,
            version: version,
            gb: 0,
            strong: 1  // 啟用Strong's number
        };
        
        if (verse) {
            params.sec = verse;
        }
        
        const url = 'https://bible.fhl.net/json/qb.php';
        console.log('請求聖經API:', url, params);
        
        const response = await axios.get(url, { 
            params,
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Bible Discord Bot)'
            }
        });
        
        console.log('API回應狀態:', response.status);
        console.log('API回應內容:', JSON.stringify(response.data, null, 2));
        
        return response.data;
    } catch (error) {
        console.error('獲取經文時發生錯誤:', error.message);
        throw error;
    }
}

// 獲取Strong's number詳細資料
async function getStrongsData(strongNumber) {
    try {
        const url = 'https://bible.fhl.net/json/qb.php';
        const params = {
            strong: strongNumber,
            gb: 0
        };
        
        const response = await axios.get(url, { 
            params,
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Bible Discord Bot)'
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('獲取Strong\'s資料時發生錯誤:', error.message);
        throw error;
    }
}

// 解析Strong's number並添加編號
function parseStrongsNumbers(text) {
    if (!text) return { text: text, strongs: [] };
    
    const strongsPattern = /<([HG]\d+)>/g;
    const strongs = [];
    let match;
    let counter = 1;
    
    // 收集所有Strong's number
    while ((match = strongsPattern.exec(text)) !== null) {
        const strongNumber = match[1];
        if (!strongs.find(s => s.number === strongNumber)) {
            strongs.push({
                number: strongNumber,
                index: counter,
                emoji: counter <= 10 ? NUMBER_EMOJIS[counter - 1] : EXTENDED_EMOJIS[counter - 11]
            });
            counter++;
        }
    }
    
    // 替換文本中的Strong's number為編號
    let processedText = text;
    strongs.forEach(strong => {
        const regex = new RegExp(`<${strong.number}>`, 'g');
        processedText = processedText.replace(regex, `^${strong.index}^`);
    });
    
    return { text: processedText, strongs: strongs };
}

// 格式化經文輸出（包含Strong's number）
function formatBibleText(data) {
    if (!data || !data.record || data.record.length === 0) {
        return null;
    }
    
    let allStrongs = [];
    let formattedText = '';
    
    if (data.record.length > 1) {
        // 多節經文
        data.record.forEach(verse => {
            const parsed = parseStrongsNumbers(verse.bible_text);
            formattedText += `**${verse.chineses} ${verse.chap}:${verse.sec}** ${parsed.text}\n\n`;
            allStrongs = allStrongs.concat(parsed.strongs);
        });
    } else {
        // 單節經文
        const verse = data.record[0];
        const parsed = parseStrongsNumbers(verse.bible_text);
        formattedText = `**${verse.chineses} ${verse.chap}:${verse.sec}** ${parsed.text}`;
        allStrongs = parsed.strongs;
    }
    
    // 去除重複的Strong's number
    const uniqueStrongs = [];
    const seen = new Set();
    allStrongs.forEach(strong => {
        if (!seen.has(strong.number)) {
            seen.add(strong.number);
            uniqueStrongs.push(strong);
        }
    });
    
    return {
        text: formattedText,
        strongs: uniqueStrongs
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
        
        // 獲取經文
        const data = await getBibleVerse(parsed.book, parsed.chapter, parsed.verse);
        const formatted = formatBibleText(data);
        
        if (!formatted) {
            await message.reply('❌ 找不到指定的經文，請檢查書卷名稱和章節是否正確。');
            return;
        }
        
        // 發送經文
        let responseText = formatted.text;
        
        // 如果有Strong's number，添加說明
        if (formatted.strongs.length > 0) {
            responseText += '\n\n📖 **原文編號說明：**\n';
            responseText += '點擊下方表情符號查看原文詳細資料\n';
            formatted.strongs.forEach(strong => {
                responseText += `${strong.emoji} = ${strong.number}\n`;
            });
        }
        
        const sentMessage = await message.reply(responseText);
        
        // 如果有Strong's number，添加表情符號反應並儲存映射
        if (formatted.strongs.length > 0) {
            messageStrongsMap.set(sentMessage.id, formatted.strongs);
            
            // 添加表情符號
            for (const strong of formatted.strongs) {
                await sentMessage.react(strong.emoji);
            }
            
            // 設置5分鐘後清理映射
            setTimeout(() => {
                messageStrongsMap.delete(sentMessage.id);
            }, 300000); // 5分鐘
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
    
    // 指令處理
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
        }
        
        return;
    }
    
    // 檢查是否為經文引用格式
    const bibleRefPattern = /^[\u4e00-\u9fff]+\d+(:|\：|\s*第\s*)\d+|^[\u4e00-\u9fff]+\d+$/;
    
    if (bibleRefPattern.test(content)) {
        await handleBibleQuery(message, content);
    }
});

// 表情符號反應事件監聽器
client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    
    // 獲取完整的反應對象
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
    
    // 檢查是否為我們追蹤的訊息
    if (messageStrongsMap.has(messageId)) {
        const strongs = messageStrongsMap.get(messageId);
        const selectedStrong = strongs.find(s => s.emoji === emoji);
        
        if (selectedStrong) {
            try {
                // 獲取Strong's number詳細資料
                const strongsData = await getStrongsData(selectedStrong.number);
                
                if (strongsData && strongsData.record && strongsData.record.length > 0) {
                    const strongInfo = strongsData.record[0];
                    
                    const embed = new EmbedBuilder()
                        .setTitle(`📖 原文編號：${selectedStrong.number}`)
                        .setColor(0x0099ff)
                        .addFields(
                            { name: '原文', value: strongInfo.w_text || '無資料', inline: true },
                            { name: '音譯', value: strongInfo.w_translit || '無資料', inline: true },
                            { name: '詞性', value: strongInfo.w_part || '無資料', inline: true },
                            { name: '字義', value: strongInfo.w_meaning || '無資料' }
                        )
                        .setFooter({ text: '資料來源：信望愛聖經工具' });
                    
                    await reaction.message.reply({ embeds: [embed] });
                } else {
                    await reaction.message.reply(`❌ 無法獲取 ${selectedStrong.number} 的詳細資料`);
                }
            } catch (error) {
                console.error('獲取Strong\'s資料時發生錯誤:', error);
                await reaction.message.reply(`❌ 查詢 ${selectedStrong.number} 時發生錯誤`);
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
