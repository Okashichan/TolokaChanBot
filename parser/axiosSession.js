import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

const url = process.env.TOLOKA_URL;

const axiosWithCookies = () => {
    const jar = new CookieJar();

    const client = wrapper(axios.create({ jar }));

    const getCookies = () => {
        return new Promise((resolve, reject) => {
            jar.getCookies(url, (err, cookies) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(cookies);
                }
            });
        });
    }

    const resetCookies = () => {
        jar.removeAllCookies(err => {
            if (err) {
                console.error('Error clearing cookies:', err);
            } else {
                console.log('Cookies cleared successfully');
            }
        });
    };

    return { client, getCookies, resetCookies };
}

export default axiosWithCookies;
