// Import necessary libraries
const { Telegraf } = require('telegraf');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Load bot token and chat ID from environment variables
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Initialize the Telegram bot
const bot = new Telegraf(BOT_TOKEN);

// --- Configuration ---
const CONFIG_DIR = 'config';
const bridgeFiles = {
    "obfs4_ipv4": path.join(CONFIG_DIR, "obfs4_ipv4.json"),
    "obfs4_ipv6": path.join(CONFIG_DIR, "obfs4_ipv6.json"),
    "webtunnel_ipv4": path.join(CONFIG_DIR, "webtunnel_ipv4.json"),
    "webtunnel_ipv6": path.join(CONFIG_DIR, "webtunnel_ipv6.json")
};

// URLs to fetch bridges from
const urls = {
    "obfs4_ipv4": "https://bridges.torproject.org/bridges?transport=obfs4",
    "obfs4_ipv6": "https://bridges.torproject.org/bridges?transport=obfs4&ipv6=yes",
    "webtunnel_ipv4": "https://bridges.torproject.org/bridges?transport=webtunnel",
    "webtunnel_ipv6": "https://bridges.torproject.org/bridges?transport=webtunnel&ipv6=yes"
};

// User agents to mimic a real browser
const user_agents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64; rv:91.0) Gecko/20100101 Firefox/91.0",
];

// --- Helper Functions ---

// Check if an IP address is IPv6
function isIPv6(address) {
    return address.includes(':');
}

// Parse and classify a bridge line
function parseAndClassifyBridge(bridgeLine) {
    bridgeLine = bridgeLine.trim();
    const parts = bridgeLine.split(' ');
    const transport = parts[0];

    if (transport !== 'obfs4' && transport !== 'webtunnel') {
        return null;
    }

    let match;
    if (transport === 'obfs4') {
        match = bridgeLine.match(/(obfs4)\s+((?:\[[a-fA-F0-9:]+\]|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}))(?::(\d+))\s+([A-F0-9]{40})\s+cert=([^\s]+)\s+iat-mode=([0-9]+)/);
        if (!match) return null;

        const [_, transport, ip, port, fingerprint, cert, iatMode] = match;
        const ipClean = ip.replace(/[[\]]/g, '');
        const type = isIPv6(ipClean) ? 'obfs4_ipv6' : 'obfs4_ipv4';

        return {
            type,
            fingerprint,
            data: {
                bridge: bridgeLine,
                ip: ipClean,
                port,
                fingerprint,
                cert,
                "iat-mode": iatMode,
                addedAt: new Date().toISOString()
            }
        };
    } else if (transport === 'webtunnel') {
        match = bridgeLine.match(/(webtunnel)\s+((?:\[[a-fA-F0-9:]+\]|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}))(?::(\d+))\s+([A-F0-9]{40})\s+url=([^\s]+)\s+ver=([^\s]+)/);
        if (!match) return null;

        const [_, transport, ip, port, fingerprint, url, ver] = match;
        const ipClean = ip.replace(/[[\]]/g, '');
        const type = isIPv6(ipClean) ? 'webtunnel_ipv6' : 'webtunnel_ipv4';

        return {
            type,
            fingerprint,
            data: {
                bridge: bridgeLine,
                ip: ipClean,
                port,
                fingerprint,
                url,
                ver,
                addedAt: new Date().toISOString()
            }
        };
    }
    return null;
}

// Load all existing bridges from the log files
function loadAllExistingBridges() {
    const allBridges = new Set();
    for (const file of Object.values(bridgeFiles)) {
        if (fs.existsSync(file)) {
            try {
                const data = JSON.parse(fs.readFileSync(file));
                if (data.bridges && Array.isArray(data.bridges)) {
                    data.bridges.forEach(bridgeInfo => {
                        if (bridgeInfo && bridgeInfo.bridge) {
                            allBridges.add(bridgeInfo.bridge);
                        }
                    });
                }
            } catch (error) {
                console.error(`Error reading or parsing ${file}:`, error);
            }
        }
    }
    return allBridges;
}

// Append a new bridge to the corresponding log file
function appendToLog(file, bridgeData) {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    let data = { bridges: [] };
    if (fs.existsSync(file)) {
        try {
            data = JSON.parse(fs.readFileSync(file));
            if (!Array.isArray(data.bridges)) {
                data.bridges = [];
            }
        } catch (error) {
            console.error(`Error reading or parsing ${file} for appending:`, error);
            data = { bridges: [] };
        }
    }
    data.bridges.push(bridgeData);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// --- Core Functions ---

// Fetch bridges from the Tor Project website
async function fetchBridges() {
    const allBridgeLines = [];
    for (const url of Object.values(urls)) {
        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": user_agents[Math.floor(Math.random() * user_agents.length)],
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Referer": "https://bridges.torproject.org/",
                    "Connection": "keep-alive",
                    "Upgrade-Insecure-Requests": "1",
                    "Sec-Fetch-Dest": "document",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "same-origin",
                    "Sec-Fetch-User": "?1",
                    "TE": "trailers"
                }
            });
            if (!response.ok) {
                console.error(`Failed to fetch ${url}: ${response.statusText}`);
                continue;
            }
            const text = await response.text();
            const $ = cheerio.load(text);
            const bridges = new Set();
            $('pre.bridge-line').each((i, el) => {
                const bridgeLine = $(el).text().trim();
                if (bridgeLine) {
                    bridges.add(bridgeLine);
                }
            });

            // Fallback to regex search if no <pre> tags are found
            if (bridges.size === 0) {
                console.log(`No <pre> tags found for ${url}. Falling back to regex search.`);
                const allText = $('body').text();
                const obfs4Regex = /obfs4 \S+:\d+ \w+ cert=\S+ iat-mode=\d/g;
                const webtunnelRegex = /webtunnel \S+:\d+ \w+ url=\S+ ver=\S+/g;
                
                let matches;
                while ((matches = obfs4Regex.exec(allText)) !== null) {
                    bridges.add(matches[0]);
                }
                while ((matches = webtunnelRegex.exec(allText)) !== null) {
                    bridges.add(matches[0]);
                }
            }
            allBridgeLines.push(...bridges);
        } catch (error) {
            console.error(`Failed to fetch or parse ${url}: ${error}`);
        }
    }
    return allBridgeLines;
}

// Send a message to the Telegram chat
async function sendTelegramMessage(message) {
    for (let i = 0; i < message.length; i += 4096) {
        await bot.telegram.sendMessage(CHAT_ID, message.substring(i, i + 4096), { parse_mode: 'HTML' });
    }
}

// Send grouped bridges to the Telegram chat
async function sendGroupedTelegramMessages(groupedBridges, title) {
    if (Object.keys(groupedBridges).length === 0) {
        return;
    }

    let message = `<b>${title}:</b>\n\n`;
    for (const [bridgeType, bridgeList] of Object.entries(groupedBridges)) {
        if (bridgeList.length > 0) {
            message += `<b>${bridgeType.replace('_', ' ').toUpperCase()}:</b>\n`;
            for (const bridge of bridgeList) {
                message += `<code>${bridge}</code>\n\n`;
            }
        }
    }

    await sendTelegramMessage(message);
}

// --- Main Execution ---
async function main() {
    const existingBridges = loadAllExistingBridges();
    const fetchedBridgeLines = await fetchBridges();

    if (fetchedBridgeLines.length === 0) {
        await sendTelegramMessage('❌ <b>Failed to fetch any bridges.</b>\nPlease check logs or try again later.');
        return;
    }

    const newBridges = {};
    const duplicateBridges = {};
    const malformedBridges = [];

    // Classify the fetched bridges
    for (const bridgeLine of fetchedBridgeLines) {
        const parsed = parseAndClassifyBridge(bridgeLine);

        if (!parsed) {
            malformedBridges.push(bridgeLine);
        } else if (existingBridges.has(bridgeLine)) {
            if (!duplicateBridges[parsed.type]) {
                duplicateBridges[parsed.type] = [];
            }
            duplicateBridges[parsed.type].push(bridgeLine);
        } else {
            if (!newBridges[parsed.type]) {
                newBridges[parsed.type] = [];
            }
            newBridges[parsed.type].push(bridgeLine);
            appendToLog(bridgeFiles[parsed.type], parsed.data);
        }
    }

    // Send the new bridges to the Telegram chat
    if (Object.keys(newBridges).length > 0) {
        await sendGroupedTelegramMessages(newBridges, '🚀 Latest Tor Bridges');
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second delay
    }

    // Send the duplicate and malformed bridges to the Telegram chat
    await sendGroupedTelegramMessages(duplicateBridges, 'Duplicate Bridges Found');
    
    if (malformedBridges.length > 0) {
        let message = '<b>Malformed Bridges Found:</b>\n\n';
        for (const bridge of malformedBridges) {
            message += `<code>${bridge}</code>\n\n`;
        }
        await sendTelegramMessage(message);
    }
}

// Run the main function
main().catch(console.error);
