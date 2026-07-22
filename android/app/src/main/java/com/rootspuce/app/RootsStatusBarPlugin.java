package com.rootspuce.app;

import android.graphics.Color;
import android.os.Build;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "RootsStatusBar")
public class RootsStatusBarPlugin extends Plugin {
    private static final String STATUS_BAR_BACKGROUND_TAG = "roots_status_bar_background";

    private View statusBarBackground;

    @PluginMethod
    public void setBackgroundColor(PluginCall call) {
        String color = call.getString("color");
        if (color == null) {
            call.reject("Color must be provided");
            return;
        }

        final int parsedColor;
        try {
            parsedColor = Color.parseColor(color);
        } catch (IllegalArgumentException exception) {
            call.reject("Invalid color provided");
            return;
        }

        getBridge().executeOnMainThread(() -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
                View background = getOrCreateStatusBarBackground();
                if (background == null) {
                    call.reject("Unable to create status bar background");
                    return;
                }

                background.setBackgroundColor(parsedColor);
                background.bringToFront();
                ViewCompat.requestApplyInsets(background);
            }

            call.resolve();
        });
    }

    private View getOrCreateStatusBarBackground() {
        if (statusBarBackground != null) {
            return statusBarBackground;
        }

        ViewGroup root = getActivity().findViewById(android.R.id.content);
        if (root == null) {
            return null;
        }

        View existingBackground = root.findViewWithTag(STATUS_BAR_BACKGROUND_TAG);
        if (existingBackground != null) {
            statusBarBackground = existingBackground;
            return statusBarBackground;
        }

        View background = new View(getActivity());
        background.setTag(STATUS_BAR_BACKGROUND_TAG);
        background.setClickable(false);
        background.setFocusable(false);
        background.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);

        FrameLayout.LayoutParams layoutParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                Gravity.TOP
        );
        root.addView(background, layoutParams);

        ViewCompat.setOnApplyWindowInsetsListener(background, (view, windowInsets) -> {
            updateStatusBarHeight(view, windowInsets);
            return windowInsets;
        });

        statusBarBackground = background;
        updateStatusBarHeight(background, ViewCompat.getRootWindowInsets(root));
        ViewCompat.requestApplyInsets(background);
        return statusBarBackground;
    }

    private void updateStatusBarHeight(View view, WindowInsetsCompat windowInsets) {
        if (windowInsets == null) {
            return;
        }

        Insets topInsets = windowInsets.getInsets(
                WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.displayCutout()
        );
        ViewGroup.LayoutParams layoutParams = view.getLayoutParams();
        if (layoutParams.height != topInsets.top) {
            layoutParams.height = topInsets.top;
            view.setLayoutParams(layoutParams);
        }
    }
}
