package com.rootspuce.app;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.ValueCallback;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

import android.os.LocaleList;

import java.util.Locale;
import java.util.Objects;

public class MainActivity extends BridgeActivity {
    private ConnectivityManager connectivityManager;
    private ConnectivityManager.NetworkCallback networkCallback;
    private View offlineView;
    private boolean isConnected = true;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(RootsStatusBarPlugin.class);
        super.onCreate(savedInstanceState);
        connectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        isConnected = hasInternetConnection();
        if (!isConnected) {
            // Initial offline launches may not have a JavaScript context yet.
            showOfflineView();
            updateOfflineView();
        }
        registerNetworkCallback();
    }

    @Override
    public void onDestroy() {
        if (connectivityManager != null && networkCallback != null) {
            try {
                connectivityManager.unregisterNetworkCallback(networkCallback);
            } catch (Exception ignored) {
                // Callback may already be unregistered when Android tears down the activity.
            }
        }
        super.onDestroy();
    }

    private void registerNetworkCallback() {
        if (connectivityManager == null) {
            return;
        }

        NetworkRequest request = new NetworkRequest.Builder()
                .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                .build();

        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(@NonNull Network network) {
                runOnUiThread(() -> {
                    isConnected = hasInternetConnection();
                    updateOfflineView();
                });
            }

            @Override
            public void onLost(@NonNull Network network) {
                runOnUiThread(() -> {
                    isConnected = hasInternetConnection();
                    if (!isConnected) {
                        updateOfflineView();
                    }
                });
            }

            @Override
            public void onCapabilitiesChanged(@NonNull Network network, @NonNull NetworkCapabilities capabilities) {
                runOnUiThread(() -> {
                    // onAvailable may precede validation; report the current active connection.
                    isConnected = hasInternetConnection();
                    updateOfflineView();
                });
            }
        };

        connectivityManager.registerNetworkCallback(request, networkCallback);
    }

    private void updateOfflineView() {
        hasActiveReflectionEditor(editorReady -> {
            if (Boolean.TRUE.equals(editorReady)) {
                // A hydrated editor owns its network notice. Keep its current document and input.
                hideOfflineView();
                notifyReflectionConnectivity();
            } else if (Boolean.FALSE.equals(editorReady) && !hasInternetConnection()) {
                showOfflineView();
            }
            // A cold-start overlay stays visible after reconnect until the user retries.
        });
    }

    private void hasActiveReflectionEditor(ValueCallback<Boolean> callback) {
        WebView webView = findWebView(findViewById(android.R.id.content));
        if (webView == null) {
            callback.onReceiveValue(false);
            return;
        }
        String documentUrl = webView.getUrl();
        if (documentUrl == null || documentUrl.isEmpty() || "about:blank".equals(documentUrl)) {
            callback.onReceiveValue(false);
            return;
        }
        // Set and removed by the mounted reflection UI; an error/blank document has no marker.
        webView.evaluateJavascript(
                "document.documentElement.getAttribute('data-roots-editor-ready') === 'true'",
                result -> {
                    if (isFinishing() || isDestroyed()) {
                        return;
                    }
                    if (webView != findWebView(findViewById(android.R.id.content))
                            || !Objects.equals(documentUrl, webView.getUrl())) {
                        // This answer belongs to an earlier document; it cannot authorize a reload.
                        callback.onReceiveValue(null);
                        return;
                    }
                    if ("true".equals(result)) {
                        callback.onReceiveValue(true);
                    } else if ("false".equals(result)) {
                        callback.onReceiveValue(false);
                    } else {
                        // An unavailable JS context does not authorize discarding a document.
                        callback.onReceiveValue(null);
                    }
                }
        );
    }

    private void notifyReflectionConnectivity() {
        WebView webView = findWebView(findViewById(android.R.id.content));
        if (webView == null) {
            return;
        }
        boolean online = hasInternetConnection();
        webView.evaluateJavascript(
                "if (document.documentElement.getAttribute('data-roots-editor-ready') === 'true') {"
                        + "window.dispatchEvent(new CustomEvent('roots-qt-connectivity', {detail: {online: "
                        + online + "}}));}",
                null
        );
    }

    private boolean hasInternetConnection() {
        if (connectivityManager == null) {
            return true;
        }
        Network activeNetwork = connectivityManager.getActiveNetwork();
        if (activeNetwork == null) {
            return false;
        }
        NetworkCapabilities capabilities = connectivityManager.getNetworkCapabilities(activeNetwork);
        return capabilities != null
                && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
    }

    private OfflineCopy getOfflineCopy() {
        Locale locale;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
            LocaleList locales = getResources().getConfiguration().getLocales();
            locale = locales != null && !locales.isEmpty() ? locales.get(0) : Locale.getDefault();
        } else {
            locale = getResources().getConfiguration().locale;
        }
        String language = locale != null ? locale.getLanguage() : "en";
        switch (language) {
            case "ko":
                return new OfflineCopy(
                        "인터넷 연결이 필요해요",
                        "Roots를 불러오려면 인터넷 연결이 필요합니다.\n연결 상태를 확인한 뒤 다시 시도해 주세요.",
                        "다시 시도"
                );
            case "de":
                return new OfflineCopy(
                        "Internetverbindung erforderlich",
                        "Roots benötigt eine Internetverbindung.\nBitte überprüfe deine Verbindung und versuche es erneut.",
                        "Erneut versuchen"
                );
            case "fr":
                return new OfflineCopy(
                        "Connexion Internet requise",
                        "Roots a besoin d’une connexion Internet.\nVérifie ta connexion, puis réessaie.",
                        "Réessayer"
                );
            case "es":
                return new OfflineCopy(
                        "Se necesita conexión a Internet",
                        "Roots necesita conexión a Internet para cargarse.\nComprueba tu conexión e inténtalo de nuevo.",
                        "Intentar de nuevo"
                );
            default:
                return new OfflineCopy(
                        "Internet connection needed",
                        "Roots needs an internet connection to load.\nPlease check your connection and try again.",
                        "Try again"
                );
        }
    }

    private void showOfflineView() {
        if (offlineView != null) {
            return;
        }

        ViewGroup root = findViewById(android.R.id.content);
        if (root == null) {
            return;
        }

        OfflineCopy copy = getOfflineCopy();
        FrameLayout overlay = new FrameLayout(this);
        overlay.setBackgroundColor(Color.rgb(250, 242, 229));
        overlay.setClickable(true);
        overlay.setFocusable(true);

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER_HORIZONTAL);
        card.setPadding(dp(24), dp(34), dp(24), dp(34));
        card.setBackground(ContextCompat.getDrawable(this, R.drawable.offline_card_background));

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.roots_offline_logo);
        logo.setContentDescription("Roots");
        logo.setAdjustViewBounds(true);
        LinearLayout.LayoutParams logoParams = new LinearLayout.LayoutParams(dp(92), dp(92));
        logoParams.bottomMargin = dp(22);
        card.addView(logo, logoParams);

        TextView title = new TextView(this);
        title.setText(copy.title);
        title.setTextColor(Color.rgb(45, 71, 45));
        title.setTextSize(24);
        title.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        title.setGravity(Gravity.CENTER);
        title.setIncludeFontPadding(true);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        card.addView(title, titleParams);

        TextView message = new TextView(this);
        message.setText(copy.message);
        message.setTextColor(Color.rgb(89, 102, 89));
        message.setTextSize(16);
        message.setGravity(Gravity.CENTER);
        message.setLineSpacing(dp(2), 1.0f);
        LinearLayout.LayoutParams messageParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        messageParams.topMargin = dp(12);
        card.addView(message, messageParams);

        Button retry = new Button(this);
        retry.setText(copy.button);
        retry.setAllCaps(false);
        retry.setTextColor(Color.WHITE);
        retry.setTextSize(16);
        retry.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        retry.setBackground(ContextCompat.getDrawable(this, R.drawable.offline_retry_button_background));
        retry.setPadding(dp(24), dp(10), dp(24), dp(10));
        retry.setOnClickListener(v -> retryLoadingRoots());
        LinearLayout.LayoutParams buttonParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                dp(52)
        );
        buttonParams.topMargin = dp(26);
        card.addView(retry, buttonParams);

        FrameLayout.LayoutParams cardParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        );
        cardParams.gravity = Gravity.CENTER;
        cardParams.leftMargin = dp(24);
        cardParams.rightMargin = dp(24);
        overlay.addView(card, cardParams);

        root.addView(overlay, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        offlineView = overlay;
    }

    private void retryLoadingRoots() {
        hasActiveReflectionEditor(editorReady -> {
            if (Boolean.TRUE.equals(editorReady)) {
                hideOfflineView();
                notifyReflectionConnectivity();
                return;
            }
            if (!Boolean.FALSE.equals(editorReady)) {
                return;
            }
            isConnected = hasInternetConnection();
            if (isConnected) {
                reloadRootWebView();
                if (offlineView != null) {
                    offlineView.postDelayed(this::hideOfflineView, 2500);
                }
            } else if (offlineView != null) {
                View currentOfflineView = offlineView;
                currentOfflineView.animate()
                        .scaleX(0.985f)
                        .scaleY(0.985f)
                        .setDuration(80)
                        .withEndAction(() -> currentOfflineView.animate().scaleX(1f).scaleY(1f).setDuration(120).start())
                        .start();
            }
        });
    }

    private void hideOfflineView() {
        if (offlineView == null) {
            return;
        }
        ViewGroup parent = (ViewGroup) offlineView.getParent();
        if (parent != null) {
            parent.removeView(offlineView);
        }
        offlineView = null;
    }

    private void reloadRootWebView() {
        WebView webView = findWebView(findViewById(android.R.id.content));
        if (webView != null) {
            webView.loadUrl("https://www.christian-roots.com");
        }
    }

    private WebView findWebView(View view) {
        if (view instanceof WebView) {
            return (WebView) view;
        }
        if (view instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) view;
            for (int i = 0; i < group.getChildCount(); i++) {
                WebView webView = findWebView(group.getChildAt(i));
                if (webView != null) {
                    return webView;
                }
            }
        }
        return null;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private static class OfflineCopy {
        final String title;
        final String message;
        final String button;

        OfflineCopy(String title, String message, String button) {
            this.title = title;
            this.message = message;
            this.button = button;
        }
    }
}
