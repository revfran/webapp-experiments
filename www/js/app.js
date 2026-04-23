document.addEventListener('DOMContentLoaded', function () {
  var WEBVIEW_URL = 'https://revfran.github.io/web-experiments/index.html';
  var currentUrl = WEBVIEW_URL;

  var backBtn = document.getElementById('back-btn');
  var forwardBtn = document.getElementById('forward-btn');
  var shareBtn = document.getElementById('share-btn');
  var urlDisplay = document.getElementById('url-display');
  var iframe = document.getElementById('webview-frame');

  urlDisplay.textContent = WEBVIEW_URL;

  iframe.addEventListener('load', function () {
    try {
      var href = iframe.contentWindow.location.href;
      if (href && href !== 'about:blank') {
        currentUrl = href;
      }
    } catch (e) {
      // cross-origin page: keep last known URL
    }
    urlDisplay.textContent = currentUrl;
  });

  backBtn.addEventListener('click', function () {
    try {
      iframe.contentWindow.history.back();
    } catch (e) {
      // cross-origin fallback: nothing to do
    }
  });

  forwardBtn.addEventListener('click', function () {
    try {
      iframe.contentWindow.history.forward();
    } catch (e) {
      // cross-origin fallback: nothing to do
    }
  });

  shareBtn.addEventListener('click', function () {
    if (navigator.share) {
      navigator.share({ url: currentUrl }).catch(function () {});
    } else {
      navigator.clipboard.writeText(currentUrl).catch(function () {});
    }
  });
});
