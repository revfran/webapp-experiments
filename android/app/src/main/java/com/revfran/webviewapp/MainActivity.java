package com.revfran.webviewapp;

import android.os.Message;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {

    @Override
    public void onStart() {
        super.onStart();
        WebView webView = getBridge().getWebView();
        webView.getSettings().setSupportMultipleWindows(true);
        webView.setWebViewClient(new FrameGuardClient(getBridge()));
        webView.setWebChromeClient(new WindowGuardClient(getBridge(), webView));
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

    /** Blocks frame-busting: intercepts any attempt to navigate the main frame to an external URL. */
    private class FrameGuardClient extends BridgeWebViewClient {
        FrameGuardClient(com.getcapacitor.Bridge bridge) { super(bridge); }

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
