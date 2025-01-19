import { StarknetIdNavigator } from "starknetid.js";
import { Provider, constants } from "starknet";
import { elizaLogger } from "@elizaos/core";

const provider = new Provider();
const starknetIdNavigator = new StarknetIdNavigator(
    provider,
    constants.StarknetChainId.SN_MAIN
);

export const getAddressFromName = async (name: string): Promise<string> => {
    try {
        if (name) {
            const apiResult = await fetch(
                `https://api.starknet.id/domain_to_addr?domain=${name}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );
            const result = await apiResult.json();
            return result.addr;
        } else {
            return "";
        }
    } catch (e) {
        elizaLogger.error(e);
        return "";
    }
};
