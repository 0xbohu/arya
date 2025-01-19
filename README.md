# Arya 🤖

Arya is a generative AI agent package created using [Eliza](https://elizaos.github.io/eliza/) framework.
The main goal of Arya is for the community to send rewards to streamer/content creator via AI agent.

You can find arya in project folder > packages > plugin-arya

## ✨ Features

All the features are tested on Starknet Mainnet

- 👥 Integration with Twitch and Youtube for creator search
- 💾 Extract creator Starknet address and Starknet ID from description
- 🔗 Integrate with Starknet ID
- 🚀 Support AVNU Token Price query and token-to-token swap
- ☁️ Supports Token Sending on Starknet

## Video Tutorials

[Arya Walk Through Demo](https://www.youtube.com/watch?v=)

## 🚀 Quick Start

### Prerequisites

- [Python 2.7+](https://www.python.org/downloads/)
- [Node.js 23+](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [pnpm](https://pnpm.io/installation)

### Environment

use `.env.example` to prepare your own `.env` (this is added in .gitignore)
Modify below entries with your own credentials

```
# AI Model API Keys
OPENAI_API_KEY=
SMALL_OPENAI_MODEL=   #recommend gpt-4o-mini

# Starknet Configuration
STARKNET_ADDRESS= # Your Starknet Mainnet Wallet Address
STARKNET_PRIVATE_KEY= # Your Starknet Mainnet Wallet Privatekey
STARKNET_RPC_URL=    #recommend https://1rpc.io/starknet

#Twitch
TWITCH_CLIENT_ID= # Your Twitch Client ID
TWITCH_CLIENT_SECRET=  # Your Twitch Client Secret
TWITCH_ACCESS_TOKEN=  # Your Twitch Access Token if already authenicated, last for 60 days

#Youtube
YOUTUBE_API_KEY= # Your youtube API v3 API key

```

### Start Eliza

```bash
pnpm i && pnpm build && pnpm start
```

Once the agent is running, You should see the message to run "pnpm start:client" at the end.
Open another terminal and move to same directory and then run below command and follow the URL to chat to your agent.

```bash
pnpm start:client
```

Read the [Documentation](https://elizaos.github.io/eliza/) to learn how to customize your Eliza.

#### Making changes and Build Arya

```bash
cd packages/plugin-arya
pnpm build

```
