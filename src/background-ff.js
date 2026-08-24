// Firefox classic background - auto-generated from modules (ticktickapi 1.4.3 fix)
const storage = {
    location: chrome.storage.sync,
    defaults: {
        showNotification: true, 
        taskTitle: "tabTitle", 
        autoClose: false, 
        dueDate: -1, 
        targetListId: null,
        taskPriority: 0,
        tags: "",
        includePageContent: true
    },
    set: function(obj) {
        return new Promise ((resolve, reject) => {
            storage.location.set(obj, function() {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                resolve();
            });
        });
    },
    get: function(obj) { 
        return new Promise ((resolve, reject) => {
            storage.location.get(obj, function(result) {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                resolve(result);
            });
        });
    },
    remove: function(obj) { 
        return new Promise ((resolve, reject) => {
            storage.location.remove(obj, function(result) {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                resolve(result);
            });
        });
    },
    loadOptions: async function() {
        var self = this;
        const storedOptions = await self.location.get(Object.keys(self.defaults));

        // set default values if no value exists (undefined)
        for (const [key, value] of Object.entries(self.defaults)) {
            if (storedOptions[key] === undefined) {
                storedOptions[key] = value;
            }
        };

        // set all values again in case defaults were not set in storage yet
        await self.set(storedOptions);
        return storedOptions;
    },
    local: {
        set: function(obj) {
            return new Promise ((resolve, reject) => {
                chrome.storage.local.set(obj, function() {
                    if (chrome.runtime.lastError) {
                        return reject(chrome.runtime.lastError);
                    }
                    resolve(obj);
                });
            });
        },
        get: function(obj) { 
            return new Promise ((resolve, reject) => {
                chrome.storage.local.get(obj, function(result) {
                    if (chrome.runtime.lastError) {
                        return reject(chrome.runtime.lastError);
                    }
                    resolve(result);
                });
            });
        },
    }
};



const ticktickApi = {
    clientId: 'TF8YKgsK67BA1htYrS',
    clientSecret: '&U2rl3Ci1(hl(zS!DVC6Dt^$#&v2cO07',
    authorized: async function() {
        let token = (await storage.get('token')).token;
        return !!token;
    },
    rest: async function(method, path, data) {
        const token = (await storage.get('token')).token;

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
                        // Firefox'ta redirectUri mismatch olabiliyor - kullanıcıya bildir
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
    // Manual token set - Firefox fallback: kullanıcı TickTick Open API'dan token'ı manuel alıp yapıştırabilir
    setManualToken: async function(token) {
        if (!token || token.trim().length < 10) throw new Error("Invalid token");
        await storage.set({token: token.trim()});
        return {success:true};
    }
};






async function getTabContentAsMarkdown(tab) {
    try {
        var result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: [
                '/lib/readability-0.4.4.js',
                '/lib/turndown-7.1.2.js',
                '/js/contentscript.js'
            ],
        });
    } catch (error) {
        console.log(error);
        return "";
    }

    if (!Array.isArray(result) || result.length == 0)
        return "";

    var markdown = result[0].result;
    // Finds # only if not immediately followed by whitespace or \ / # " : * ? < > |
    // these symbols all invalidate a string that would otherwise be recognized as a tag
    // by TickTick. We place an invalid symbol after each found #.
    const removeTagsRegex = /#(?![\s\\\/#":*?<>|])/g;
    markdown = markdown.replace(removeTagsRegex, '#/');
    return markdown;
}

async function oneClickTickTick(tab, contextInfo) {
    if (!await ticktickApi.authorized()) {
        chrome.runtime.openOptionsPage();
        return;
    }

    const options = await storage.loadOptions();

    var plainTitle = tab.title;

    var taskData = {
        title: '[' + tab.title + '](' + tab.url + ')'
    };

    if (contextInfo && contextInfo.selectionText) {
        if (options.taskTitle == "selectedText") {
            if (options.includePageContent) {
                taskData.content = "# " + taskData.title;
                taskData.content += "\n\n" + await getTabContentAsMarkdown(tab);
            } else {
                taskData.content = taskData.title;
            }
            taskData.title = '[' + contextInfo.selectionText + '](' + tab.url + ')';
            plainTitle = contextInfo.selectionText;
        } else {
            taskData.content = contextInfo.selectionText;
        }
    } else if (options.includePageContent) {
        taskData.content = await getTabContentAsMarkdown(tab);
    }

    var dueDateNum = Number(options.dueDate);

    if (dueDateNum != -1) {
        var dueDate = new Date();
        dueDate.setHours(0, 0, 0, 0);
        // add one day of milliseconds times dueDate value (0 = today, 1 = tomorrow, etc.)
        dueDate.setTime(dueDate.getTime() + dueDateNum * 24 * 60 * 60 * 1000);
        let dateStr = dueDate.toISOString();
        dateStr = dateStr.replace('Z', '+0000')
        taskData.dueDate = dateStr;
        taskData.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        taskData.isAllDay = true;  // required to not show up as "at 00:00"
    }

    if (options.targetListId) {
        taskData.projectId = options.targetListId;
    }

    if (options.taskPriority) {
        taskData.priority = options.taskPriority;
    }

    if (options.tags) {
        // example: "  tag1   tag2" -> "#tag1 #tag2"
        let tags = options.tags
            .split(" ")
            .filter(tag => tag)  // remove empty tags (i.e. extra spaces)
            .map(tag => '#' + tag.trim())
            .join(" ");

        if (taskData.content) {
            taskData.content += "\n\n";
        } else {
            taskData.content = "";
        }

        taskData.content += "Tags: " + tags
    }

    const task = ticktickApi.task.create(taskData);
    var notification = null;

    if (options.showNotification) {
        let newNotification = {
            title: "TickTick Task Created",
            message: 'Title: ' + plainTitle,
            iconUrl: "/icons/icon256.png",
            type: "basic",
            buttons: [
                { title: 'Show Task...' },
                { title: 'Delete Task' }
            ]
        };

        notification = createNotification(null, newNotification, task);
    }

    if (options.autoClose) {
        chrome.tabs.remove(tab.id, function () { });
    }

    try {
        var response = await task;

        if (!response.ok) {
            if (response.status === 401) {
                chrome.runtime.openOptionsPage();
                return;
            }
            throw new Error("An error occured during task creation: " + response.status);
        } else {
            const data = await response.clone().json();
            console.log("Success: ", data);
        }
    } catch (error) {
        console.log(error);

        let updatedContent = {
            title: "Failed to create task!",
            message: error.message,
            buttons: []
        };

        if (notification) {
            notification.then(notId => {
                chrome.notifications.update(notId, updatedContent);
            });
        } else {
            createNotification(null, updatedContent);
        }

        if (options.autoClose) {
            // try to recover the tab, only try it on the last session that was closed
            // otherwise it might restore an unrelated session
            chrome.sessions.getRecentlyClosed({ maxResults: 1 }, function (sessions) {
                if (sessions.length > 0 && sessions[0].tab && sessions[0].tab.index === tab.index) {
                    chrome.sessions.restore(sessions[0].tab.sessionId);
                }
            });
        }
    }
}

function createNotification(notificationId, options, taskPromise) {
    return new Promise((resolve, reject) => {
        chrome.notifications.create(notificationId, options, function (createdId) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            }

            var handler = function (id, buttonIndex, retries) {
                if (id != createdId) {
                    return;
                }

                taskPromise
                    .then(response => response.clone().json())
                    .then(data => {
                        if (buttonIndex === 0) {
                            chrome.tabs.create({ url: 'https://ticktick.com/webapp/#p/' + data.projectId + '/tasks/' + data.id });
                            chrome.notifications.clear(id);
                        } else if (buttonIndex === 1) {
                            ticktickApi.task.delete(data.projectId, data.id);
                            chrome.notifications.clear(id);
                        }
                    });

                chrome.notifications.onButtonClicked.removeListener(handler);
            };

            chrome.notifications.onButtonClicked.addListener(handler);
            resolve(createdId);
        });
    });
};

function getSelectionInfo(info, tab, callback) {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => getSelection().toString()
    }, function (response) {
        var result = response[0].result;
        var selection = info.selectionText;

        if (!chrome.runtime.lastError && result.length > 0) {
            selection = result[0];
        }

        selection = info.selectionText.replace(/(\r\n|\n|\r)/gm, "\n\n");
        callback(selection);
    });
};

self.addEventListener('install', function(event) {
    // currently unused
});


// add context menu items
chrome.runtime.onInstalled.addListener(function() {
    chrome.contextMenus.create({
        id: 'OneClickTickTick',
        title: "Send page to TickTick",
        contexts: ["page", "frame", "link", "editable", "video", "audio", "action", "image"]}
    );
    chrome.contextMenus.create({
        id: 'OneClickTickTick' + 'Selection',
        title: "Send selection to TickTick",
        contexts: ["selection"]}
    );
});


// handle extension button click
chrome.action.onClicked.addListener(function(tab) {
    oneClickTickTick(tab);    
});


// listen to context menu
chrome.contextMenus.onClicked.addListener(function(info, tab) {
    if (info.menuItemId == 'OneClickTickTick' + 'Selection') {
        getSelectionInfo(info, tab, function(selection) {
            info.selectionText = selection;
            oneClickTickTick(tab, info);
        });
    } else if (info.menuItemId.startsWith('OneClickTickTick')) {
        oneClickTickTick(tab, info);
    }
});


// communication with options page
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.type === 'task') {
        oneClickTickTick(message.payload)
    } else if (message.type === 'login') {
        ticktickApi.login().then(
            result => sendResponse(result),
            err => sendResponse({error: err.error || String(err), redirectUri: err.redirectUri})
        );
    } else if (message.type === 'logout') {
        ticktickApi.logout().then(
            result => sendResponse(result),
            err => sendResponse({error: String(err)})
        );
    } else if (message.type === 'getOptions') {
        storage.loadOptions().then(opts => {
            sendResponse(opts);
        }).catch(err => sendResponse({error: err.message || String(err)}));
    } else if (message.type === 'setManualToken') {
        ticktickApi.setManualToken(message.payload.token).then(
            result => sendResponse(result),
            err => sendResponse({error: err.message || String(err)})
        );
    } else if (message.type === 'setOptions') {
        console.log("setOptions:", message.payload)
        storage.set(message.payload);
    } else if (message.type === 'isLoggedIn') {
        ticktickApi.authorized().then(response => {
            sendResponse(response);
        }).catch(err => sendResponse({error: String(err)}));
    } else {
        console.log("Unrecognized message:", message, sender);
    }

    return true;
});