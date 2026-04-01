import { NextResponse } from 'next/server';
import axios from 'axios';

// Mazal mkhlyin 50 slot f l-code bach ila bghiti t-zed f l-mustaqbal matbedelch l-code
const MAX_BOT_SLOTS = 50; 

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function collectBotsFromEnv() {
    const bots = [];
    for (let n = 1; n <= MAX_BOT_SLOTS; n++) {
        const token = process.env[`BOT${n}_TOKEN`];
        const chatId = process.env[`BOT${n}_CHATID`];
        if (token && chatId) bots.push({ token, chatId, slot: n });
    }
    return bots;
}

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { text, messageIds = {}, type } = body;

        if (type === 'keepalive') return NextResponse.json({ ok: true }, { headers: corsHeaders });

        const bots = collectBotsFromEnv();
        const newMessageIds: Record<string, any> = { ...messageIds };
        
        // Hna khdmna b Promise.all nichan hit 5 dyal l-botat dghya kaysaliw
        const results = await Promise.all(
            bots.map(async (bot, index) => {
                const currentMessageId = messageIds[index];
                const baseUrl = `https://api.telegram.org/bot${bot.token}`;
                
                // Edit ghir ila kan ID w machi l-message d "Success" wla "Start"
                const shouldEdit = !!currentMessageId && type !== 'completed' && type !== 'typing_start';

                try {
                    if (shouldEdit) {
                        await axios.post(`${baseUrl}/editMessageText`, {
                            chat_id: bot.chatId,
                            message_id: currentMessageId,
                            text: text,
                            parse_mode: 'HTML'
                        }, { timeout: 5000 }); // 5 seconds timeout kafi
                        
                        newMessageIds[index] = currentMessageId;
                    } else {
                        const res = await axios.post(`${baseUrl}/sendMessage`, {
                            chat_id: bot.chatId,
                            text: text,
                            parse_mode: 'HTML'
                        }, { timeout: 5000 });

                        if (res.data?.result?.message_id) {
                            newMessageIds[index] = res.data.result.message_id;
                        }
                    }
                    return { ok: true };
                } catch (err: any) {
                    const desc = err.response?.data?.description || '';
                    if (desc.includes('not modified')) {
                        newMessageIds[index] = currentMessageId;
                        return { ok: true };
                    }
                    console.error(`Error Bot ${bot.slot}:`, desc);
                    return { ok: false };
                }
            })
        );

        return NextResponse.json({ success: true, messageIds: newMessageIds }, { headers: corsHeaders });

    } catch (error: any) {
        return NextResponse.json({ error: 'Error' }, { status: 500, headers: corsHeaders });
    }
}