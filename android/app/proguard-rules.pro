# Capacitor WebView + JS bridge
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface

# Capacitor plugin classes
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }

# Cordova plugins (cordova-plugin-purchase)
-keep class org.apache.cordova.** { *; }

# AdMob
-keep class com.google.android.gms.ads.** { *; }

# Firebase Analytics
-keep class com.google.firebase.** { *; }

# In-App Billing
-keep class com.android.vending.billing.** { *; }

# Preserve line number information for debugging crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
