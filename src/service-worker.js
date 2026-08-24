import {storage} from '/js/store.js';
import {ticktickApi} from '/js/ticktickapi.js';
import {oneClickTickTick, getSelectionInfo} from '/js/oneclickticktick.js';

// [FIX] Removed self-registration bug - service worker should not register itself
// Firefox/Chrome extension service workers are auto-registered via manifest

//////////////////
// Event Handlers
//////////////////


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
        ticktickApi.login().then(sendResponse);
    } else if (message.type === 'logout') {
        ticktickApi.logout().then(sendResponse);
    } else if (message.type === 'getOptions') {
        storage.loadOptions().then(opts => {
            sendResponse(opts);
        });
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
        });
    } else {
        console.log("Unrecognized message:", message, sender);
    }

    return true;
});