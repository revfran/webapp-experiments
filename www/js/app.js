document.addEventListener('DOMContentLoaded', function () {
  var HOME_URL  = 'https://revfran.github.io/web-experiments/index.html';
  var NEWS_URL  = 'https://revfran.github.io/web-experiments/news.html';
  var currentUrl = NEWS_URL;
  var navDepth = 0;
  var navDelta = 1;
  var navigatingBack = false;
  var readerActive = false;

  var homeBtn      = document.getElementById('home-btn');
  var shareBtn     = document.getElementById('share-btn');
  var readerBtn    = document.getElementById('reader-btn');
  var urlDisplay   = document.getElementById('url-display');
  var iframe       = document.getElementById('webview-frame');
  var readerPane   = document.getElementById('reader-pane');
  var readerUrlInput = document.getElementById('reader-url-input');
  var readerLoadBtn  = document.getElementById('reader-load-btn');
  var readerArticle  = document.getElementById('reader-article');
  var readerLoading  = document.getElementById('reader-loading');

  urlDisplay.textContent = NEWS_URL;

  // Called by native Android when it intercepts a frame-bust or target=_blank
  // navigation and redirects it into the iframe, giving us the real article URL.
  window.onIframeUrlChange = function (url) {
    currentUrl = url;
    urlDisplay.textContent = url;
  };

  iframe.addEventListener('load', function () {
    if (navigatingBack) {
      navigatingBack = false;
      navDepth = Math.max(0, navDepth - 1);
    } else {
      navDepth = Math.max(0, navDepth + navDelta);
      navDelta = 1;
      // Push a main-frame history entry so Android's back gesture can traverse it.
      if (navDepth > 1) {
        history.pushState({ navDepth: navDepth, url: currentUrl }, '');
      }
    }

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

  // Android back button / swipe → webView.goBack() (native) → popstate fires here.
  window.addEventListener('popstate', function () {
    navigatingBack = true;
    if (readerActive) setReaderMode(false);
    try {
      iframe.contentWindow.history.back();
    } catch (e) {
      navigatingBack = false;
    }
  });

  homeBtn.addEventListener('click', function () {
    if (readerActive) setReaderMode(false);
    navDepth = 0;
    navDelta = 1;
    navigatingBack = false;
    history.replaceState(null, '');
    iframe.src = HOME_URL;
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
