import { NextResponse } from 'next/server';
import axios from 'axios';

const MAX_BOT_SLOTS = 50;

function collectBotsFromEnv() {
    const bots = [];
    for (let n = 1; n <= MAX_BOT_SLOTS; n++) {
        const token = process.env[`BOT${n}_TOKEN`];
        const chatId = process.env[`BOT${n}_CHATID`];
        if (token && chatId) {
            bots.push({ token, chatId, slot: n });
        }
    }
    return bots;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { text, messageIds = {}, type } = body;

        if (type === 'keepalive') return NextResponse.json({ ok: true });

        const bots = collectBotsFromEnv();
        const newMessageIds: Record<string, any> = { ...messageIds };

        const results = await Promise.all(
            bots.map(async (bot, index) => {
                const currentMessageId = messageIds[index];
                const baseUrl = `https://api.telegram.org/bot${bot.token}`;

                // ILA KAN MESSAGE ID KAYN, KANDIRO EDIT (T3DIL)
                if (currentMessageId && type !== 'completed' && type !== 'typing_start') {
                    try {
                        await axios.post(`${baseUrl}/editMessageText`, {
                            chat_id: bot.chatId,
                            message_id: currentMessageId,
                            text: text,
                            parse_mode: 'HTML'
                        });
                        return { ok: true, action: 'edit' };
                    } catch (err: any) {
                        // Ila t9te3 l-ittissal wla l-message howa nite (ignore error)
                        return { ok: true, action: 'edit_ignored' };
                    }
                }

                // ILA MA KAYNCH ID WLA TYPE HOWA COMPLETED, KANSIFTO JDID
                try {
                    const response = await axios.post(`${baseUrl}/sendMessage`, {
                        chat_id: bot.chatId,
                        text: text,
                        parse_mode: 'HTML'
                    });
                    if (response.data?.result?.message_id) {
                        newMessageIds[index] = response.data.result.message_id;
                    }
                    return { ok: true, action: 'send' };
                } catch (err) {
                    return { ok: false };
                }
            })
        );

        return NextResponse.json({ success: true, messageIds: newMessageIds });
    } catch (error) {
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}