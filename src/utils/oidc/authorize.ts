/*
Copyright 2023 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { completeAuthorizationCodeGrant } from "matrix-js-sdk/src/oidc/authorize";
import { QueryDict } from "matrix-js-sdk/src/utils";
import { OidcClientConfig } from "matrix-js-sdk/src/autodiscovery";
import { generateOidcAuthorizationUrl } from "matrix-js-sdk/src/oidc/authorize";
import { randomString } from "matrix-js-sdk/src/randomstring";

/**
 * Start OIDC authorization code flow
 * Generates auth params, stores them in session storage and
 * Navigates to configured authorization endpoint
 * @param delegatedAuthConfig from discovery
 * @param clientId this client's id as registered with configured issuer
 * @param homeserverUrl target homeserver
 * @param identityServerUrl OPTIONAL target identity server
 * @returns Promise that resolves after we have navigated to auth endpoint
 */
export const startOidcLogin = async (
    delegatedAuthConfig: OidcClientConfig,
    clientId: string,
    homeserverUrl: string,
    identityServerUrl?: string,
): Promise<void> => {
    const redirectUri = window.location.origin;

    const nonce = randomString(10);

    const authorizationUrl = await generateOidcAuthorizationUrl({
        metadata: delegatedAuthConfig.metadata,
        redirectUri,
        clientId,
        homeserverUrl,
        identityServerUrl,
        nonce,
    });

    window.location.href = authorizationUrl;
};

/**
 * Gets `code` and `state` query params
 *
 * @param queryParams
 * @returns code and state
 * @throws when code and state are not valid strings
 */
const getCodeAndStateFromQueryParams = (queryParams: QueryDict): { code: string; state: string } => {
    const code = queryParams["code"];
    const state = queryParams["state"];

    if (!code || typeof code !== "string" || !state || typeof state !== "string") {
        throw new Error("Invalid query parameters for OIDC native login. `code` and `state` are required.");
    }
    return { code, state };
};

/**
 * Attempt to complete authorization code flow to get an access token
 * @param queryParams the query-parameters extracted from the real query-string of the starting URI.
 * @returns Promise that resolves with accessToken, identityServerUrl, and homeserverUrl when login was successful
 * @throws When we failed to get a valid access token
 */
export const completeOidcLogin = async (
    queryParams: QueryDict,
): Promise<{
    homeserverUrl: string;
    identityServerUrl?: string;
    accessToken: string;
    clientId: string;
    issuer: string;
}> => {
    const { code, state } = getCodeAndStateFromQueryParams(queryParams);
    const { homeserverUrl, tokenResponse, identityServerUrl, oidcClientSettings } =
        await completeAuthorizationCodeGrant(code, state);

    // @TODO(kerrya) do something with the refresh token https://github.com/vector-im/element-web/issues/25444

    return {
        homeserverUrl: homeserverUrl,
        identityServerUrl: identityServerUrl,
        accessToken: tokenResponse.access_token,
        clientId: oidcClientSettings.clientId,
        issuer: oidcClientSettings.issuer,
    };
};
