var login = function() {
    $('#login').prop('disabled', true).text('Giriş yapılıyor...');
    $('#loginError').hide();
    chrome.runtime.sendMessage({type: 'login'}, function(response) {
        console.log("login response:", response);
        if (chrome.runtime.lastError) {
            console.error("lastError:", chrome.runtime.lastError);
            $('#loginError').text("Hata: " + chrome.runtime.lastError.message).show();
            $('#login').prop('disabled', false).text('Login');
            return;
        }
        if (response && response.error) {
            // Firefox OAuth redirect_uri mismatch - güvenli text ile göster (XSS önleme)
            $('#loginError').empty();
            $('#loginError').append($('<div>').text("Login başarısız: " + response.error));
            if (response.redirectUri) {
                $('#loginError').append($('<small>').text("Redirect URI: " + response.redirectUri).css('display','block'));
                $('#loginError').append($('<small>').text("TickTick bu redirect_uri'yi reddetti. Aşağıdaki manuel token yöntemini kullanın.").css('display','block'));
            }
            $('#loginError').show();
            $('#login').prop('disabled', false).text('Login');
            // Manuel token kutusunu göster
            $('#manualTokenSection').show();
            return;
        }
        location.reload();
    });
};

var logout = function() {
    chrome.runtime.sendMessage({type: 'logout'}, function(response) {
        location.reload();
    });
};

var setOptions = function(payload) {
    chrome.runtime.sendMessage({type: 'setOptions', payload: payload});
};

var setManualToken = function() {
    let token = $('#manualToken').val().trim();
    if (!token) {
        $('#manualTokenError').text("Token boş olamaz").show();
        return;
    }
    $('#manualTokenError').hide();
    chrome.runtime.sendMessage({type: 'setManualToken', payload: {token: token}}, function(response) {
        if (chrome.runtime.lastError) {
            $('#manualTokenError').text(chrome.runtime.lastError.message).show();
            return;
        }
        if (response && response.error) {
            $('#manualTokenError').text(response.error).show();
            return;
        }
        location.reload();
    });
};

var init = function() {
    chrome.runtime.sendMessage({type: 'isLoggedIn'}, function(response) {
        console.log("isLoggedIn:", response);
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            response = false;
        }
        var isLoggedIn = !!response && response !== true ? !response.error : !!response;
        if (response && response.error) isLoggedIn = false;
        $('#optionsSection').toggle(isLoggedIn);
        $('#logoutSection').toggle(isLoggedIn);
        $('#loginSection').toggle(!isLoggedIn);
        var isFirefox = navigator.userAgent.indexOf("Firefox") !== -1;
        if (isFirefox && !isLoggedIn) {
            $('#manualTokenSection').show();
        }
    });

    $dueDate = $('#dueDate');
    $taskTitle = $('#taskTitle');
    $showNotification = $('#showNotification');
    $autoClose = $('#autoClose');
    $targetList = $('#targetList');
    $taskPriority = $('#taskPriority');
    $tagsList = $('#tagsList');
    $includePageContent = $('#includePageContent');

    chrome.runtime.sendMessage({type: 'getOptions'}, function(options) {
        console.log("Options:", options);
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            return;
        }
        $dueDate.val(options.dueDate);
        $taskTitle.val(options.taskTitle);
        $targetList.val(options.targetListId);
        $tagsList.val(options.tags);
        $taskPriority.val(options.taskPriority);
        $showNotification.prop('checked', options.showNotification);
        $autoClose.prop('checked', options.autoClose);
        $includePageContent.prop('checked', options.includePageContent)
    });

    $('#login').click(login);
    $('#logout').click(logout);
    $('#saveManualToken').click(setManualToken);

    $dueDate.change(function() {
        setOptions({dueDate: $dueDate.val()});
    });
    $showNotification.change(function() {
        setOptions({showNotification: $showNotification.is(':checked')});
    });
    $taskTitle.change(function() {
        setOptions({taskTitle: $taskTitle.val()});
    });
    $autoClose.change(function() {
        setOptions({autoClose: $autoClose.is(':checked')});
    });
    $targetList.change(function() {
        setOptions({targetListId: $targetList.val().trim()});
    });
    $tagsList.change(function() {
        setOptions({tags: $tagsList.val().trim()});
    });
    $taskPriority.change(function() {
        setOptions({taskPriority: $taskPriority.val()});
    });
    $includePageContent.change(function() {
        setOptions({includePageContent: $includePageContent.is(':checked')});
    });
};

$(document).ready(function() {
    init();
});
