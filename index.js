// 🔁 加入以下在現有程式碼中的擴充整合

// 新增：取得 Strong's number 的函式
async function getStrongsFromVerse(verseId) {
    try {
        const response = await axios.get('https://iq-bible.p.rapidapi.com/GetOriginalText', {
            params: { verseId },
            headers: {
                'X-RapidAPI-Key': IQ_BIBLE_API_KEY,
                'X-RapidAPI-Host': 'iq-bible.p.rapidapi.com',
                'Accept': 'application/json'
            },
            timeout: 10000
        });
        return response.data;
    } catch (error) {
        console.error('取得 Strong 原文資料失敗:', error.message);
        return [];
    }
}

// ⏫ 在 parseIQBibleResponse 之後修改：處理 API 回應並整合 Strong's number
async function parseIQBibleResponseWithStrongs(apiResponse, bookName, chapter, verse, bookId) {
    const parsed = parseIQBibleResponse(apiResponse, bookName, chapter, verse);
    if (!parsed || !verse) return parsed;

    const verseId = `${bookId}${String(chapter).padStart(3, '0')}${String(verse).padStart(3, '0')}`;
    const strongsData = await getStrongsFromVerse(verseId);

    const strongs = strongsData.filter(entry => entry.strongs).map((entry, i) => ({
        number: entry.strongs,
        word: entry.word,
        emoji: NUMBER_EMOJIS[i] || EXTENDED_EMOJIS[i] || '🔍'
    }));

    parsed.strongs = strongs;
    return parsed;
}

// ⏫ 修改 handleBibleQuery 將 parseIQBibleResponse 換成上面的 async 函式
async function handleBibleQuery(message, reference) {
    try {
        const parsed = parseReference(reference);
        if (!parsed) {
            await message.reply('❌ 無法解析經文引用格式。請使用如：太1:1、馬太福音1:1、詩23 等格式。');
            return;
        }

        console.log('解析結果:', parsed);
        const data = await getBibleVerse(parsed.book, parsed.chapter, parsed.verse);

        // bookId fallback
        const bookIds = {
            'Genesis': '01', 'Exodus': '02', 'Leviticus': '03', 'Numbers': '04', 'Deuteronomy': '05',
            'Matthew': '40', 'Mark': '41', 'Luke': '42', 'John': '43'
        };
        const bookId = bookIds[parsed.book] || '01';

        const formatted = await parseIQBibleResponseWithStrongs(data, parsed.bookName, parsed.chapter, parsed.verse, bookId);

        if (!formatted || !formatted.record || formatted.record.length === 0) {
            await message.reply('❌ 找不到指定的經文，請檢查書卷名稱和章節是否正確。');
            return;
        }

        const record = formatted.record[0];
        let responseText = `**${parsed.bookName} ${record.chapter}${record.verse ? ':' + record.verse : ''}**`;
        responseText += ` ${record.text}`;

        if (responseText.length > 1800) {
            responseText = responseText.slice(0, 1800) + '...\n*(經文過長，已截斷)*';
        }

        const sentMessage = await message.reply(responseText);

        if (formatted.strongs && formatted.strongs.length > 0) {
            messageStrongsMap.set(sentMessage.id, formatted.strongs);
            const max = Math.min(20, formatted.strongs.length);
            for (let i = 0; i < max; i++) {
                try {
                    await sentMessage.react(formatted.strongs[i].emoji);
                } catch (err) {
                    console.error('加上 emoji 失敗:', err);
                }
            }
            setTimeout(() => messageStrongsMap.delete(sentMessage.id), 5 * 60 * 1000);
        }
    } catch (error) {
        console.error('聖經查詢錯誤:', error);
        await message.reply('❌ 查詢經文時發生錯誤。');
    }
}
