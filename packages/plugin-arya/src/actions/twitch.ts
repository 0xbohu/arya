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
    getTwitchCredentials,
    getMediaUserStarknetIDAddress,
} from "../utils/index.ts";
import { getAddressFromName } from "../utils/starknetIdpro.ts";

import { validateStarknetConfig } from "../environment.ts";

// ****Get Twitch Data*****

interface TwitchQueryContent {
    twitchUser: string;
}

export function isValidTwitchQueryContent(
    content: TwitchQueryContent
): content is TwitchQueryContent {
    // Validate types
    const validTypes = typeof content.twitchUser === "string";
    if (!validTypes) {
        return false;
    }

    const validTwitchUser =
        content.twitchUser && content.twitchUser.length >= 3;

    return validTwitchUser;
}

const getTwitchTemplate = `Respond with a JSON markdown block containing only the extracted values.
Use null for any values that cannot be determined.
User asks for twitch, you need to find the username from the user input,
For example when user ask: "Get twitch user ABCDEF", the twitchUser is ABCDEF

Example response:
\`\`\`json
{
    "twitchUser": "somevalue"
}
\`\`\`

{{recentMessages}}

Extract the following information about the requested token price:
- twitchUser

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.`;

export const getTwitchContent: Action = {
    name: "GET_TWITCH_DATA",
    similes: ["GET_TWITCH_VIDEO", "GET_TWITCH_CREATOR", "GET_TWITCH_USER"],
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        await validateStarknetConfig(runtime);
        return true;
    },
    description:
        "Get a twitch user and recent videos. Use this action when a user asks you to get twich user or video.",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Querying GET_TWITCH_USER handler...");
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        const getTwitchContext = composeContext({
            state,
            template: getTwitchTemplate,
        });

        const response = await generateObjectDeprecated({
            runtime,
            context: getTwitchContext,
            modelClass: ModelClass.MEDIUM,
        });

        elizaLogger.log(`Validting...`, `${response}`);

        if (!isValidTwitchQueryContent(response)) {
            callback?.({
                text: "Invalid twitch query, please try again.",
            });
            return false;
        }

        // try {
        elizaLogger.log(`Twitch User: ${response.twitchUser}`);

        // Twitch API Get User

        const twitchCredentials = getTwitchCredentials(runtime);

        const apiResult = await fetch(
            `https://api.twitch.tv/helix/users?login=${response.twitchUser}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${twitchCredentials["TWITCH_ACCESS_TOKEN"]}`,
                    "Client-Id": `${twitchCredentials["TWITCH_CLIENT_ID"]}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const result = await apiResult.json();

        elizaLogger.log(
            "Twitch User",
            `ID ${result.data[0].id}`,
            `Username ${result.data[0].login}`,
            `Bio ${result.data[0].description}`
        );

        const twitchUserId = result.data[0].id;
        const twitchUserLogin = result.data[0].login;

        // Twitch API Get Videos

        const videoApiResult = await fetch(
            `https://api.twitch.tv/helix/videos?user_id=${twitchUserId}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${twitchCredentials["TWITCH_ACCESS_TOKEN"]}`,
                    "Client-Id": `${twitchCredentials["TWITCH_CLIENT_ID"]}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const videoResult = await videoApiResult.json();
        const mostRecentVideoUrl =
            videoResult.data.length > 0 ? videoResult.data[0].url : "";

        const mostRecentVideoFeed =
            videoResult.data.length > 0
                ? [
                      {
                          id: crypto.randomUUID(),
                          url: videoResult.data[0].thumbnail_url
                              .replace("%{width}", "500")
                              .replace("%{height}", "500"),
                          title: videoResult.data[0].title,
                          source: `StreamID ${videoResult.data[0].stream_id}`,
                          description: videoResult.data[0].description,
                          text: videoResult.data[0].description,
                          contentType: "image/png",
                      },
                  ]
                : null;

        // Lookup & verify address

        const twitchUserStarknetDetails = getMediaUserStarknetIDAddress(
            result.data[0].description
        );
        const twitchUserStarknetAddress =
            twitchUserStarknetDetails["STARK_ADDRESS"];
        const twitchUserStarknetId = twitchUserStarknetDetails["STARK_ID"];

        elizaLogger.log(`StarknetId ${twitchUserStarknetId}`);

        const getSNAddress = await getAddressFromName(twitchUserStarknetId);

        elizaLogger.log(`SNAddress ${getSNAddress}`);

        // callback result to user

        callback?.({
            text: `The twitch userId is: ${twitchUserId}
            , twitch username is ${twitchUserLogin}
            , most recent video at ${mostRecentVideoUrl}
            , Starknet Address is ${twitchUserStarknetAddress}
            , Starknet ID is ${twitchUserStarknetId}
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
                    text: "Get Twitch user satoshiwarlock",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Ok, I'll check this Twitch user",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Get videos for satoshiwarlock on Twitch",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Ok, I'll check the videos for this Twitch user",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
