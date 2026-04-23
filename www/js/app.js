document.addEventListener('DOMContentLoaded', function () {
  var WEBVIEW_URL = 'https://revfran.github.io/web-experiments/news.html';
  var currentUrl = WEBVIEW_URL;
  var navDepth = 0;
  var navDelta = 1;
  var readerActive = false;

  var backBtn = document.getElementById('back-btn');
  var forwardBtn = document.getElementById('forward-btn');
  var shareBtn = document.getElementById('share-btn');
  var readerBtn = document.getElementById('reader-btn');
  var urlDisplay = document.getElementById('url-display');
  var iframe = document.getElementById('webview-frame');
  var readerPane = document.getElementById('reader-pane');
  var readerUrlInput = document.getElementById('reader-url-input');
  var readerLoadBtn = document.getElementById('reader-load-btn');
  var readerArticle = document.getElementById('reader-article');
  var readerLoading = document.getElementById('reader-loading');

  urlDisplay.textContent = WEBVIEW_URL;

  // Called by native Android code when it intercepts a navigation (frame-busting
  // or target="_blank") and redirects it into the iframe, giving us the real URL.
  window.onIframeUrlChange = function (url) {
    currentUrl = url;
    urlDisplay.textContent = url;
  };

  iframe.addEventListener('load', function () {
    navDepth = Math.max(0, navDepth + navDelta);
    navDelta = 1;
    try {
      var href = iframe.contentWindow.location.href;
      if (href && href !== 'about:blank') {
        currentUrl = href;
        urlDisplay.textContent = href;
      }
    } catch (e) {
      // cross-origin: currentUrl already updated by onIframeUrlChange if native intercepted
    }
    readerBtn.style.display = navDepth > 1 ? 'flex' : 'none';
    if (readerActive) setReaderMode(false);
  });

  backBtn.addEventListener('click', function () {
    navDelta = -1;
    try { iframe.contentWindow.history.back(); } catch (e) {}
  });

  forwardBtn.addEventListener('click', function () {
    navDelta = 1;
    try { iframe.contentWindow.history.forward(); } catch (e) {}
  });

  shareBtn.addEventListener('click', function () {
    if (navigator.share) {
      navigator.share({ url: currentUrl }).catch(function () {});
    } else {
      navigator.clipboard.writeText(currentUrl).catch(function () {});
    }
  });

  readerBtn.addEventListener('click', function () {
    setReaderMode(!readerActive);
  });

  readerLoadBtn.addEventListener('click', function () {
    var url = readerUrlInput.value.trim();
    if (url) loadArticle(url);
  });

  function setReaderMode(active) {
    readerActive = active;
    readerBtn.classList.toggle('active', active);
    if (active) {
      iframe.style.display = 'none';
      readerPane.classList.remove('hidden');
      readerUrlInput.value = currentUrl;
      loadArticle(currentUrl);
    } else {
      readerPane.classList.add('hidden');
      iframe.style.display = '';
      readerArticle.innerHTML = '';
    }
  }

  function loadArticle(url) {
    readerLoading.classList.remove('hidden');
    readerArticle.innerHTML = '';
    fetch('https://corsproxy.io/?url=' + encodeURIComponent(url))
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        var base = doc.createElement('base');
        base.href = url;
        doc.head.insertBefore(base, doc.head.firstChild);
        var article = new Readability(doc).parse();
        readerLoading.classList.add('hidden');
        if (article) {
          readerArticle.innerHTML =
            '<h1>' + (article.title || '') + '</h1>' + article.content;
        } else {
          readerArticle.innerHTML = '<p class="reader-error">No se pudo extraer el contenido del artículo.</p>';
        }
      })
      .catch(function (err) {
        readerLoading.classList.add('hidden');
        readerArticle.innerHTML = '<p class="reader-error">Error al cargar: ' + err.message + '</p>';
      });
  }
});
