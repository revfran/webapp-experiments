package com.revfran.webviewapp;

import android.os.Message;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.BridgeWebViewClient;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.GZIPInputStream;

public class MainActivity extends BridgeActivity {

    @Override
    public void onStart() {
        super.onStart();
        WebView webView = getBridge().getWebView();
        webView.getSettings().setSupportMultipleWindows(true);
        webView.setWebViewClient(new FrameGuardClient(getBridge()));
        webView.setWebChromeClient(new WindowGuardClient(getBridge(), webView));
    }

    /** Native back button / swipe-back gesture: navigate the iframe back when possible. */
    @Override
    public void onBackPressed() {
        if (getBridge().getWebView().canGoBack()) {
            getBridge().getWebView().goBack();
        } else {
            super.onBackPressed();
        }
    }

    /** Redirects article URLs into the iframe instead of letting them take over the main WebView. */
    private void injectToIframe(WebView view, String url) {
        String safe = url
            .replace("\\", "\\\\")
            .replace("'", "\\'")
            .replace("\n", "")
            .replace("\r", "");
        view.post(() -> view.evaluateJavascript(
            "(function(u){" +
            "  var f=document.getElementById('webview-frame');" +
            "  if(f)f.src=u;" +
            "  if(typeof window.onIframeUrlChange==='function')window.onIframeUrlChange(u);" +
            "})('" + safe + "')", null));
    }

    private class FrameGuardClient extends BridgeWebViewClient {
        FrameGuardClient(com.getcapacitor.Bridge bridge) { super(bridge); }

        /** Blocks frame-busting: any attempt to navigate the main frame to an external URL
         *  is redirected into the iframe instead. */
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            String url = request.getUrl().toString();
            if (request.isForMainFrame()
                    && !url.startsWith("http://localhost")
                    && !url.startsWith("capacitor://")) {
                injectToIframe(view, url);
                return true;
            }
            return super.shouldOverrideUrlLoading(view, request);
        }

        /** Strips X-Frame-Options and CSP frame-ancestors from iframe HTML responses so that
         *  sites like BBC (SAMEORIGIN) render normally instead of showing a black screen. */
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            String accept = request.getRequestHeaders().get("Accept");
            String scheme = request.getUrl().getScheme();
            if (!request.isForMainFrame()
                    && accept != null && accept.contains("text/html")
                    && scheme != null && scheme.startsWith("http")) {
                try {
                    HttpURLConnection conn =
                        (HttpURLConnection) new URL(request.getUrl().toString()).openConnection();
                    conn.setInstanceFollowRedirects(true);
                    conn.setConnectTimeout(10_000);
                    conn.setReadTimeout(15_000);
                    for (Map.Entry<String, String> h : request.getRequestHeaders().entrySet()) {
                        conn.setRequestProperty(h.getKey(), h.getValue());
                    }
                    conn.connect();

                    int status = conn.getResponseCode();
                    String reason = conn.getResponseMessage();
                    if (reason == null || reason.isEmpty()) reason = "OK";

                    String rawContentType = conn.getContentType();
                    if (rawContentType == null) rawContentType = "text/html; charset=utf-8";
                    String mimeType = rawContentType.split(";")[0].trim();

                    // Forward all response headers except the iframe-blocking ones.
                    Map<String, String> headers = new HashMap<>();
                    for (Map.Entry<String, List<String>> e : conn.getHeaderFields().entrySet()) {
                        if (e.getKey() == null || e.getValue() == null || e.getValue().isEmpty()) continue;
                        String key = e.getKey().toLowerCase();
                        if (key.equals("x-frame-options")) continue;
                        if (key.equals("content-security-policy")) continue;
                        headers.put(e.getKey(), e.getValue().get(0));
                    }

                    InputStream stream = status >= 400 ? conn.getErrorStream() : conn.getInputStream();
                    if (stream == null) stream = new ByteArrayInputStream(new byte[0]);
                    if ("gzip".equalsIgnoreCase(conn.getContentEncoding())) {
                        stream = new GZIPInputStream(stream);
                    }

                    return new WebResourceResponse(mimeType, null, status, reason, headers, stream);
                } catch (Exception ignored) {}
            }
            return super.shouldInterceptRequest(view, request);
        }
    }

    /** Intercepts target="_blank" links: loads them in the iframe instead of a new window. */
    private class WindowGuardClient extends BridgeWebChromeClient {
        private final WebView host;
        WindowGuardClient(com.getcapacitor.Bridge bridge, WebView host) {
            super(bridge);
            this.host = host;
        }

        @Override
        public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
            WebView sink = new WebView(view.getContext());
            sink.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                    injectToIframe(host, req.getUrl().toString());
                    return true;
                }
            });
            ((WebView.WebViewTransport) resultMsg.obj).setWebView(sink);
            resultMsg.sendToTarget();
            return true;
        }
    }
}
