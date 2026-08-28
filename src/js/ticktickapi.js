import {storage} from '/js/store.js';

const MIN_TOKEN_LENGTH = 10;

export const ticktickApi = {
    clientId: 'TF8YKgsK67BA1htYrS',
    clientSecret: '&U2rl3Ci1(hl(zS!DVC6Dt^$#&v2cO07',
    authorized: async function() {
        try {
            const result = await storage.get('token');
            const token = result && result.token;
            return typeof token === 'string' && token.trim().length >= MIN_TOKEN_LENGTH;
        } catch (_) {
            return false;
        }
    },
    rest: async function(method, path, data) {
        const result = await storage.get('token');
        const token = result && result.token;

        var config = {
            method: method,
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        }

        if (data)
            config.body = JSON.stringify(data);

        const response = await fetch('https://api.ticktick.com/open/v1/' + path, config);
        return response;
    },
    task: {
        create: async function(data) {
            return ticktickApi.rest('POST', 'task', data);
        },
        delete: async function(projectId, taskId) {
            return ticktickApi.rest('DELETE', `project/${projectId}/task/${taskId}`);
        }
    },
    logout: function() {
        return new Promise((resolve, reject) => {
            storage.remove('token').then(() => {
                if (chrome.identity && chrome.identity.clearAllCachedAuthTokens) {
                    chrome.identity.clearAllCachedAuthTokens(() => { resolve({success:true}) });
                } else {
                    resolve({success:true});
                }
            }).catch(reject);
        });
    },
    login: function() {
        var self = this;
        var redirectUri = chrome.identity.getRedirectURL();
        var scope = 'tasks:write';
    
        var authURL = new URL('https://ticktick.com/oauth/authorize');
        authURL.searchParams.append('client_id', self.clientId); 
        authURL.searchParams.append('scope', scope); 
        authURL.searchParams.append('state', ''); 
        authURL.searchParams.append('redirect_uri', redirectUri); 
        authURL.searchParams.append('response_type', 'code'); 
    
        console.log("[TickTick] auth URL:", authURL.href);
        console.log("[TickTick] redirectUri:", redirectUri);
        
        return new Promise((resolve, reject) => {
            // Firefox fix: check chrome.runtime.lastError
            chrome.identity.launchWebAuthFlow(
                {
                    url: authURL.href,
                    interactive: true
                },
                function(redirectUrl) {
                    if (chrome.runtime.lastError) {
                        console.error("[TickTick] launchWebAuthFlow lastError:", chrome.runtime.lastError.message);
                        // Firefox may have redirectUri mismatch - notify the user
                        reject({ error: chrome.runtime.lastError.message, redirectUri: redirectUri, authUrl: authURL.href });
                        return;
                    }
                    console.log("[TickTick] redirectUrl:", redirectUrl);
                    if (!redirectUrl) {
                        console.error("[TickTick] No redirectUrl - user cancelled or error");
                        reject({ error: "No redirect - user cancelled or TickTick rejected redirect_uri", redirectUri: redirectUri });
                        return;
                    }
                    try {
                        var response = new URL(redirectUrl);
                        var authCode = response.searchParams.get('code');
                        console.log("[TickTick] Auth Code:", authCode);
            
                        if (!authCode) {
                            let err = response.searchParams.get('error') || 'no_code';
                            console.error("[TickTick] Auth failed, no code:", redirectUrl);
                            reject({ error: "Auth failed: " + err, redirectUrl: redirectUrl, redirectUri: redirectUri });
                            return;
                        }
            
                        var tokenParams = {
                            client_id: self.clientId,
                            client_secret: self.clientSecret,
                            code: authCode,
                            grant_type: 'authorization_code',
                            scope: scope,
                            redirect_uri: redirectUri
                        }
            
                        console.log("[TickTick] exchanging code for token");
            
                        fetch('https://ticktick.com/oauth/token', {
                                method: 'POST',
                                body: new URLSearchParams(tokenParams)
                            })
                            .then(function(response) {
                                if (!response.ok) {
                                    console.error("[TickTick] Token response not ok:", response.status, response.statusText);
                                    return response.text().then(t => { throw new Error("Token fetch failed: " + response.status + " " + t); });
                                }
                                return response;
                            })
                            .then(response => response.json())
                            .then(function(data) {
                                console.log("[TickTick] Success:", data);
                                if (!data.access_token) {
                                    throw new Error("No access_token in response: " + JSON.stringify(data));
                                }
                                console.log("[TickTick] Access token:", data.access_token);
                                storage.set({token: data.access_token}).then(() => resolve({success:true, token: data.access_token}));
                            })
                            .catch(err => {
                                console.error("[TickTick] Token error:", err);
                                reject({ error: err.message || String(err) });
                            });
                    } catch(e) {
                        console.error("[TickTick] URL parse error:", e);
                        reject({ error: e.message });
                    }
                }
            );
        });
    },
    setManualToken: async function(token) {
        if (typeof token !== 'string' || token.trim().length < MIN_TOKEN_LENGTH) throw new Error("Invalid token");
        const t = token.trim();
        await storage.set({token: t});
        try {
            const resp = await fetch('https://api.ticktick.com/open/v1/project', {
                headers: { 'Authorization': 'Bearer ' + t }
            });
            if (!resp.ok) throw new Error("Token validation failed: " + resp.status);
        } catch (e) {
            await storage.remove('token');
            throw new Error("Invalid token or TickTick API unreachable: " + (e.message || String(e)));
        }
        return {success:true};
    }
};
