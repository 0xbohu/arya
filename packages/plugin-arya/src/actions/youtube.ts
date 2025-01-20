import {
    Action,
    ActionExample,
    composeContext,
    elizaLogger,
    generateObjectDeprecated,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
} from "@elizaos/core";

import {
    getStarknetAccount,
    getYoutubeCredentials,
    getMediaUserStarknetIDAddress,
} from "../utils/index.ts";
import { getAddressFromName } from "../utils/starknetIdpro.ts";

import { validateStarknetConfig } from "../environment.ts";

// ****Get Youtube Data*****

interface YoutubeQueryContent {
    youtubeHandler: string;
}

export function isValidYoutubeQueryContent(
    content: YoutubeQueryContent
): content is YoutubeQueryContent {
    // Validate types
    const validTypes = typeof content.youtubeHandler === "string";
    if (!validTypes) {
        return false;
    }

    const validYoutubeHandler =
        content.youtubeHandler && content.youtubeHandler.length >= 3;

    return validYoutubeHandler;
}

const getYoutubeTemplate = `Respond with a JSON markdown block containing only the extracted values.
Use null for any values that cannot be determined.
User asks for youtube, you need to find the username from the user input,
For example when user ask: "Get youtube user ABCDEF", the youtubeHandler is ABCDEF

Example response:
\`\`\`json
{
    "youtubeHandler": "somevalue"
}
\`\`\`

{{recentMessages}}

Extract the following information about the requested token price:
- youtubeHandler

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.`;

export const getYoutubeContent: Action = {
    name: "GET_YOUTUBE_DATA",
    similes: [
        "GET_YOUTUBE_VIDEO",
        "GET_YOUTUBE_CREATOR",
        "GET_YOUTUBE_USER",
        "GET_YOUTUBE_HANDLER",
    ],
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        await validateStarknetConfig(runtime);
        return true;
    },
    description:
        "Get a youtube user and recent videos. Use this action when a user asks you to get youtube user or handler or video.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        const isTelegramClient =
            message.content.source == "telegram" ? true : false;
        elizaLogger.log(`isTelegramClient ${isTelegramClient}`);
        elizaLogger.log("Querying GET_YOUTUBE_USER handler...");
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const getYoutubeContext = composeContext({
            state,
            template: getYoutubeTemplate,
        });

        const response = await generateObjectDeprecated({
            runtime,
            context: getYoutubeContext,
            modelClass: ModelClass.MEDIUM,
        });

        elizaLogger.log(`Validting...`, `${response}`);

        if (!isValidYoutubeQueryContent(response)) {
            callback?.({
                text: "Invalid youtube query, please try again.",
            });
            return false;
        }

        const formatYoutubeHandler = response.youtubeHandler.startsWith("@")
            ? response.youtubeHandler
            : `@${response.youtubeHandler}`;

        // try {
        elizaLogger.log(`Youtube User: ${formatYoutubeHandler}`);

        // Youtube API Get Channel Info

        const youtubeCredentials = getYoutubeCredentials(runtime);

        const apiResult = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&forHandle=${formatYoutubeHandler}&key=${youtubeCredentials["YOUTUBE_API_KEY"]}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        const result = await apiResult.json();

        elizaLogger.log(
            "Youtube User",
            `channelId ${result.items[0].id}`,
            `channelTitle ${result.items[0].snippet.title}`,
            `channelDescription ${result.items[0].snippet.description}`
        );

        // Youtube API Get Videos

        const channelId = result.items[0].id;

        const videoApiResult = await fetch(
            `https://www.googleapis.com/youtube/v3/search?channelId=${channelId}&part=snippet,id&order=date&maxResults=5&key=${youtubeCredentials["YOUTUBE_API_KEY"]}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        const videoResult = await videoApiResult.json();
        videoResult.items[0].id.videoId;

        const mostRecentVideoUrl =
            videoResult.items.length > 0
                ? `https://www.youtube.com/watch?v=${videoResult.items[0].id.videoId}`
                : "";

        const mostRecentVideoFeed =
            videoResult.items.length > 0 && !isTelegramClient
                ? [
                      {
                          id: crypto.randomUUID(),
                          url: videoResult.items[0].snippet.thumbnails.high.url,
                          title: videoResult.items[0].snippet.title,
                          source: videoResult.items[0].snippet.channelTitle,
                          description: videoResult.items[0].snippet.description,
                          text: videoResult.items[0].snippet.description,
                          contentType: "image/png",
                      },
                  ]
                : null;

        // Lookup & verify address

        const youtubeUserStarknetDetails = getMediaUserStarknetIDAddress(
            result.items[0].snippet.description
        );
        const youtubeUserStarknetAddress =
            youtubeUserStarknetDetails["STARK_ADDRESS"];
        const youtubeUserStarknetId = youtubeUserStarknetDetails["STARK_ID"];

        elizaLogger.log(`StarknetId ${youtubeUserStarknetId}`);

        const getSNAddress = await getAddressFromName(youtubeUserStarknetId);

        elizaLogger.log(`SNAddress ${getSNAddress}`);

        // callback result to user

        callback?.({
            text: `The channel Id is: ${channelId}
            , Starknet Address is ${youtubeUserStarknetAddress}
            , Starknet ID is ${youtubeUserStarknetId}
            , Verified Recipient Address is ${getSNAddress}
            `,
            attachments: mostRecentVideoFeed,
        });
        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Get Youtube user @bohu1276",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Ok, I'll check this Youtube user",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Get videos for @bohu1276 on Youtube",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Ok, I'll check the videos for this Youtube user",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
