import 'dotenv/config';
import axios from 'axios';
import { Telegraf } from 'telegraf';
import { v4 as uuidv4 } from 'uuid';
import {
    connect,
    createUser,
    addTolokaUserCookies,
    getTolokaUserCookies,
    removeTolokaUserCookies
} from './db/mongo.js';
import { searchTorrents, getLoginCredentials } from './parser/toloka.js';

await connect();
const bot = new Telegraf(process.env.BOT_TOKEN);

const paginateArray = (array, arraySize) => {
    const pages = [];
    for (let i = 0; i < array.length; i += arraySize) {
        pages.push(array.slice(i, i + arraySize));
    }
    return pages;
}

const download = async (url, cookies) => {
    let res = await axios.get(url, { responseType: 'arraybuffer', headers: { Cookie: cookies } })
        .catch((err) => console.log(`download(${url})|failed to download video...`))

    return Buffer.from(res.data, 'utf-8')
}

bot.start((ctx) => {
    const { id, username } = ctx.from;

    createUser(id, username);

    ctx.reply(`Hello, ${username || 'Anonymous'}!\nTo search for torrents just send me a message with the query.\nTo login with your credentials use /login <login> <password> command.\nTo logout use /logout command.`);
});

bot.command('login', async (ctx) => {
    const { id } = ctx.from;
    const [login, password] = ctx.payload.split(' ');

    if (!login || !password) return ctx.reply('Couldn\'t parse login and password. Please use /login <login> <password> format.');

    const cookies = await getLoginCredentials(login, password);

    if (!cookies) return ctx.reply('Couldn\'t login with provided credentials. Please try again.');

    addTolokaUserCookies(id, cookies);

    ctx.reply('Logged in successfully!');
});

bot.command('logout', async (ctx) => {
    const { id } = ctx.from;

    const result = removeTolokaUserCookies(id);

    if (result) return ctx.reply('Logged out successfully!');
});

bot.on('message', async (ctx) => {
    if (!("text" in ctx.message)) return;

    const { id } = ctx.from;
    const query = ctx.message.text;

    let currentPage = 0;
    let currentElement = 0;
    let messageId = null;

    let cookies = await getTolokaUserCookies(id);

    console.log('OldCookies:', cookies)

    const { torrents, localCookies, newUserCookies } = await searchTorrents(query, cookies);

    cookies = newUserCookies || cookies;

    if (cookies) addTolokaUserCookies(id, cookies);

    const uuid = uuidv4();

    if (!(torrents.length > 0 && Object.keys(torrents[0]).length > 0)) return ctx.reply('No torrents found.');

    const messages = torrents.map(torrent => {
        return `<a href="${torrent['Назва'].link}">${torrent['Назва'].text}</a>
    Автор: <b>${torrent['Автор'].text}</b>
    Розмір: <b>${torrent['Розмір']}</b>
    Роздають: <b>${torrent['S']}</b>
    Завантажити: <b><a href="${torrent['Посил'].link}">${torrent['Посил'].text}</a></b>
        `
    })

    const pages = paginateArray(messages, 5);

    const sendPage = async () => {
        if (messageId) {
            await ctx.telegram.deleteMessage(ctx.chat.id, messageId);
        }

        const tempPages = pages.map(page => [...page]);

        tempPages[currentPage][currentElement] = '✅ ' + pages[currentPage][currentElement];

        const msg = await ctx.replyWithHTML(tempPages[currentPage].join('\n'), {
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "⬅️", callback_data: `${id}_prev_${uuid}` },
                        { text: "⬆️", callback_data: `${id}_up_${uuid}` },
                        { text: "📥", callback_data: `${id}_dl_${uuid}` },
                        { text: "⬇️", callback_data: `${id}_down_${uuid}` },
                        { text: "➡️", callback_data: `${id}_next_${uuid}` },
                    ],
                ]
            }
        });

        messageId = msg.message_id;
    }

    await sendPage();

    bot.action(`${id}_prev_${uuid}`, async (ctx) => {
        if (currentPage > 0) {
            currentPage--;
            currentElement = 0;
            await sendPage();
        }
        ctx.answerCbQuery();
    });

    bot.action(`${id}_next_${uuid}`, async (ctx) => {
        if (currentPage < pages.length - 1) {
            currentPage++;
            currentElement = 0;
            await sendPage();
        }
        ctx.answerCbQuery();
    });

    bot.action(`${id}_down_${uuid}`, async (ctx) => {
        if (currentElement < pages[currentPage].length - 1) {
            currentElement++;
            await sendPage();
        }
        ctx.answerCbQuery();
    });

    bot.action(`${id}_up_${uuid}`, async (ctx) => {
        if (currentElement > 0) {
            currentElement--;
            await sendPage();
        }
        ctx.answerCbQuery();
    });

    bot.action(`${id}_dl_${uuid}`, async (ctx) => {
        const toDownload = torrents[currentPage * 5 + currentElement]['Посил'].link;

        const buffer = await download(toDownload, cookies ? cookies : localCookies);

        ctx.telegram.sendDocument(ctx.chat.id, { source: buffer, filename: torrents[currentPage * 5 + currentElement]['Назва'].filename });
    });
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))