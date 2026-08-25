export const storage = {
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
    _syncGet: function(keys) {
        return new Promise((resolve) => {
            try {
                chrome.storage.sync.get(keys, (result) => {
                    if (chrome.runtime.lastError) resolve({});
                    else resolve(result || {});
                });
            } catch (_) { resolve({}); }
        });
    },
    _localGet: function(keys) {
        return new Promise((resolve) => {
            try {
                chrome.storage.local.get(keys, (result) => {
                    if (chrome.runtime.lastError) resolve({});
                    else resolve(result || {});
                });
            } catch (_) { resolve({}); }
        });
    },
    set: function(obj) {
        const syncP = new Promise((resolve) => {
            try {
                chrome.storage.sync.set(obj, () => resolve(!chrome.runtime.lastError));
            } catch (_) { resolve(false); }
        });
        const localP = new Promise((resolve) => {
            try {
                chrome.storage.local.set(obj, () => resolve(!chrome.runtime.lastError));
            } catch (_) { resolve(false); }
        });
        return Promise.all([syncP, localP]).then(() => {});
    },
    get: async function(keys) {
        const syncResult = await this._syncGet(keys);
        const hasValue = (() => {
            if (typeof keys === "string") return syncResult[keys] !== undefined;
            if (Array.isArray(keys)) return keys.some(k => syncResult[k] !== undefined);
            if (keys && typeof keys === "object") return Object.keys(keys).some(k => syncResult[k] !== undefined);
            return false;
        })();
        if (hasValue) return syncResult;
        const localResult = await this._localGet(keys);
        const hasLocal = (() => {
            if (typeof keys === "string") return localResult[keys] !== undefined;
            if (Array.isArray(keys)) return keys.some(k => localResult[k] !== undefined);
            if (keys && typeof keys === "object") return Object.keys(keys).some(k => localResult[k] !== undefined);
            return false;
        })();
        if (hasLocal) {
            const merged = { ...syncResult, ...localResult };
            return merged;
        }
        return syncResult;
    },
    remove: function(keys) {
        const syncP = new Promise((resolve) => {
            try { chrome.storage.sync.remove(keys, () => resolve()); } catch (_) { resolve(); }
        });
        const localP = new Promise((resolve) => {
            try { chrome.storage.local.remove(keys, () => resolve()); } catch (_) { resolve(); }
        });
        return Promise.all([syncP, localP]).then(() => {});
    },
    loadOptions: async function() {
        var self = this;
        const keys = Object.keys(self.defaults);
        const syncOptions = await self._syncGet(keys);
        const localOptions = await self._localGet(keys);
        const storedOptions = { ...localOptions, ...syncOptions };
        for (const k of keys) {
            if (syncOptions[k] !== undefined) storedOptions[k] = syncOptions[k];
            else if (localOptions[k] !== undefined) storedOptions[k] = localOptions[k];
        }
        for (const [key, value] of Object.entries(self.defaults)) {
            if (storedOptions[key] === undefined) {
                storedOptions[key] = value;
            }
        }
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