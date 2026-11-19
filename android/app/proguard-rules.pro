# Capacitor dispatches JavaScript methods and activity/permission callbacks by
# runtime annotations. Keep the annotation types themselves in R8 full mode.
# The installed Capacitor library supplies the plugin-class/constructor rules.
-keepattributes RuntimeVisibleAnnotations,RuntimeInvisibleAnnotations,AnnotationDefault
-keepattributes Signature,InnerClasses,EnclosingMethod
-keep @interface com.getcapacitor.annotation.** { *; }
-keep @interface com.getcapacitor.PluginMethod { *; }

# Callbacks may be declared on a non-public plugin base class. Preserve their
# names even when that class is not itself annotated as a Capacitor plugin.
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.PermissionCallback <methods>;
}

# Android WebView calls these methods from JavaScript rather than Java callers.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Retain source locations for the release mapping.txt / crash retracing.
-keepattributes SourceFile,LineNumberTable
