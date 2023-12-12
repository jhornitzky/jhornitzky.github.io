function runInternetInvaders() {
    chrome.storage.local.get("iiRunning", function (data) {
        if (typeof data.iiRunning == "undefined" || data.iiRunning === false) {
            chrome.storage.local.set({ iiRunning: true });
            iiRunner.start();
        } else {
            chrome.storage.local.set({ iiRunning: false });
            iiRunner.stop();
        }
    });
}

chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: runInternetInvaders
    });
});