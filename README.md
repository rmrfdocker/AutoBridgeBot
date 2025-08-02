# Auto Tor Bridge Bot

This is a simple yet powerful Telegram bot that automatically fetches the latest Tor bridges from the Tor Project's website and sends them to a designated Telegram channel. It's designed to be run on a schedule, ensuring you always have access to fresh bridges.

## Features

- **Automatic Bridge Fetching**: Runs on a schedule (e.g., using GitHub Actions) to find new Tor bridges.
- **Multiple Bridge Types**: Fetches both `obfs4` and `webtunnel` bridges for IPv4 and IPv6.
- **Telegram Integration**: Sends newly found bridges to a specified Telegram channel or chat.
- **Duplicate Prevention**: Keeps a history of sent bridges to avoid sending the same ones repeatedly.
- **Clean Formatting**: Delivers bridges in a clean, readable format within Telegram.

## How It Works

1.  **Fetch**: The bot scrapes the official Tor Project bridges website.
2.  **Parse**: It extracts all the bridge lines from the website's HTML.
3.  **Compare**: It compares the fetched bridges against a local history of already-sent bridges.
4.  **Notify**: It sends any new, unique bridges to your Telegram channel.
5.  **Save**: It saves the new bridges to the history to prevent future duplicates.

## Getting Started

To run your own instance of the Auto Tor Bridge Bot, follow these steps:

### 1. Prerequisites

-   [Node.js](https://nodejs.org/) (v14 or higher)
-   [npm](https://www.npmjs.com/) (usually comes with Node.js)
-   A Telegram Bot Token from [@BotFather](https://t.me/BotFather)
-   The ID of the Telegram channel or chat where you want to send the bridges.

### 2. Installation

1.  **Clone the repository or download the files.**

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Set up your environment variables:**
    -   Create a file named `.env` in the project's root directory.
    -   Copy the contents of `.env.example` into it and add your credentials.

### 3. Running the Bot

You can run the bot manually or set it up to run on a schedule.

-   **To run the bot once:**
    ```sh
    npm start
    ```
-   **To run automatically with GitHub Actions:**
    The bot is pre-configured to run every 12 hours via GitHub Actions. Simply enable the workflow in your forked repository's "Actions" tab and set the required secrets (`TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`).

## Configuration

-   **Scheduling**: You can change the fetch frequency by editing the `cron` schedule in `.github/workflows/main.yml`.
-   **Bridge Types**: The bridge types to fetch are defined in the `urls` object in `index.js`.
-   **Bridge History**: The bot stores the history of sent bridges in the `config` directory.
