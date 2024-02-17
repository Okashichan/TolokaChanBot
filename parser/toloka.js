import * as cheerio from 'cheerio';
import axiosWithCookies from './axiosSession.js';

const url = process.env.TOLOKA_URL;

const { client, getCookies, resetCookies } = axiosWithCookies();

const getLoginCredentials = async (username = process.env.TOLOKA_LOGIN, password = process.env.TOLOKA_PASSWORD) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    formData.append('autologin', 'on');
    formData.append('ssl', 'on');
    formData.append('login', 'Вхід');

    const res = await client.post(`${url}login.php`, formData, { withCredentials: true });

    if (!res.data.includes(username)) return;

    const cookies = await getCookies();

    resetCookies();

    return cookies.map(cookie => `${cookie.key}=${cookie.value}`).join('; ');
}

const parseSearch = (html) => {

    const $ = cheerio.load(html);

    const keys = [];
    $('table.forumline tbody tr th:not(:first-child)').each((i, el) => {
        keys.push($(el).text().trim());
    });

    const parsedData = [];

    $('table.forumline tbody tr:not(:first)').each((i, el) => {
        if (i <= 5 || $(el).is(':last-child')) return;

        const rowData = {};

        $(el).find('td:not(:first-child)').each((i, el) => {
            const key = keys[i];

            let value = $(el).text().trim();

            const link = $(el).find('a').attr('href');
            if (link) value = {
                text: value,
                link: `https://toloka.to/${link}`,
                filename: `${link}.torrent`
            };

            const status = $(el).find('img').attr('src');

            if (status) value = $(el).attr('title');

            rowData[key] = value;
        });

        parsedData.push(rowData);
    });

    const sortBySeeds = parsedData.sort((a, b) => { return b.S - a.S });

    return sortBySeeds;
}

const searchTorrents = async (query, userCookies, offset = 0) => {
    const cookies = userCookies || await getLoginCredentials();

    const { data } = await client.get(`${url}tracker.php?nm=${query}&start=${offset}`, {
        withCredentials: true,
        headers: {
            Cookie: cookies
        }
    });

    const newUserCookies = await getCookies();

    resetCookies();

    return {
        'torrents': parseSearch(data),
        'localCookies': userCookies || cookies,
        'newUserCookies': newUserCookies
    };
}

export { getLoginCredentials, searchTorrents }