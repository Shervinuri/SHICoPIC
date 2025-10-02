// This is your serverless function that acts as a smart gateway.
// It receives requests from your frontend and forwards them to the target API
// using server-side proxies to avoid rate limiting.

const fetch = require('node-fetch');

// لیست پروکسی‌های عمومی و رایگان.
// کد به صورت خودکار بین این آدرس‌ها می‌چرخد.
const PROXIES = [
    'https://proxy.cors.sh/',
    'https://corsproxy.io/?', // <-- پروکسی جدید و رایگان
    // در صورت پیدا کردن پروکسی‌های معتبر دیگر، می‌توانید به این لیست اضافه کنید
];

let proxyIndex = 0; // این متغیر برای چرخیدن بین پروکسی‌ها استفاده می‌شود

exports.handler = async (event, context) => {
    // 1. فقط درخواست‌های POST مجاز هستند
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // 2. دریافت تاریخچه چت از بدنه‌ی درخواست
        const { chatHistory } = JSON.parse(event.body);

        if (!chatHistory) {
            return { statusCode: 400, body: 'Missing chatHistory in request body' };
        }

        const targetApiUrl = 'https://text.pollinations.ai/openai';

        // 3. انتخاب یک پروکسی متفاوت برای هر درخواست
        const proxyUrl = PROXIES[proxyIndex];
        // رفتن به پروکسی بعدی در لیست برای درخواست بعدی
        proxyIndex = (proxyIndex + 1) % PROXIES.length;

        const proxiedUrl = `${proxyUrl}${targetApiUrl}`;

        console.log(`درخواست از طریق پروکسی سرور ارسال شد: ${proxyUrl}`);

        // 4. ساخت هدرهای درخواست به صورت هوشمند
        const headers = {
            'Content-Type': 'application/json',
        };

        // اگر پروکسی cors.sh بود، هدر مخصوص آن را اضافه کن
        if (proxyUrl.includes('cors.sh')) {
            headers['x-cors-api-key'] = 'temp_1234567890';
        }

        // 5. ارسال درخواست fetch از طریق پروکسی انتخاب شده با هدرهای مناسب
        const response = await fetch(proxiedUrl, {
            method: 'POST',
            headers: headers, // <-- استفاده از هدرهای داینامیک
            body: JSON.stringify({
                model: 'openai',
                messages: chatHistory
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Proxy fetch failed with status: ${response.status} - ${errorBody}`);
        }

        const data = await response.json();

        // 6. ارسال پاسخ موفقیت‌آمیز به فرانت‌اند
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        };

    } catch (error) {
        console.error('خطا در تابع نتلیفای:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to process request.' }),
        };
    }
};

