document.addEventListener('DOMContentLoaded', function () {
  var WEBVIEW_URL = 'https://revfran.github.io/web-experiments/index.html';

  var openBtn = document.getElementById('open-webview-btn');
  var closeBtn = document.getElementById('close-webview-btn');
  var overlay = document.getElementById('webview-overlay');
  var iframe = document.getElementById('webview-frame');

  openBtn.addEventListener('click', function () {
    iframe.src = WEBVIEW_URL;
    overlay.classList.remove('hidden');
  });

  closeBtn.addEventListener('click', function () {
    overlay.classList.add('hidden');
    iframe.src = 'about:blank';
  });
});
