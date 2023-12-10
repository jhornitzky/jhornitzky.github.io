function runLoki() {
    lokiTextRunner.toggleLoki();
}

chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: runLoki
    });
});