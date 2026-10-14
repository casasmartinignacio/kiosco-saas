package app.kiosco.android

import android.annotation.SuppressLint
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private lateinit var offline: View
    private lateinit var address: EditText

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        hideSystemBars()
        window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        enterKioskMode()

        web = findViewById(R.id.web)
        offline = findViewById(R.id.offline)
        address = findViewById(R.id.address)

        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.mediaPlaybackRequiresUserGesture = false
        web.setBackgroundColor(android.graphics.Color.WHITE)
        val devices = DeviceConfig()
        web.addJavascriptInterface(KioskBridge(devices, WifiPayment(devices), LanPrinter(devices)), "Kiosk")
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                return request.url.host != Uri.parse(currentUrl()).host
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                offline.visibility = View.GONE
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) showOffline()
            }
        }

        findViewById<Button>(R.id.retry).setOnClickListener {
            val typed = address.text.toString().trim()
            if (typed.startsWith("http://") || typed.startsWith("https://")) {
                getSharedPreferences("kiosk", MODE_PRIVATE).edit().putString("url", typed).apply()
            }
            load()
        }
        load()
    }

    private fun currentUrl(): String {
        return getSharedPreferences("kiosk", MODE_PRIVATE)
            .getString("url", null)
            ?: getString(R.string.kiosk_url)
    }

    private fun load() {
        val url = currentUrl()
        address.setText(url)
        offline.visibility = View.GONE
        web.loadUrl(url)
    }

    private fun showOffline() {
        offline.visibility = View.VISIBLE
    }

    override fun onResume() {
        super.onResume()
        enterKioskMode()
    }

    private fun enterKioskMode() {
        try {
            val dpm = getSystemService(DevicePolicyManager::class.java) ?: return
            val admin = ComponentName(this, KioskAdminReceiver::class.java)
            if (dpm.isDeviceOwnerApp(packageName)) {
                dpm.setLockTaskPackages(admin, arrayOf(packageName))
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    dpm.setLockTaskFeatures(admin, DevicePolicyManager.LOCK_TASK_FEATURE_NONE)
                }
                dpm.setKeyguardDisabled(admin, true)
                dpm.setStatusBarDisabled(admin, true)
                val home = IntentFilter(Intent.ACTION_MAIN).apply {
                    addCategory(Intent.CATEGORY_HOME)
                    addCategory(Intent.CATEGORY_DEFAULT)
                }
                dpm.addPersistentPreferredActivity(admin, home, ComponentName(this, MainActivity::class.java))
                if (dpm.isLockTaskPermitted(packageName)) startLockTask()
            } else if (dpm.isLockTaskPermitted(packageName)) {
                startLockTask()
            }
        } catch (_: SecurityException) {
        }
    }

    private fun hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val controller = WindowInsetsControllerCompat(window, window.decorView)
        controller.hide(WindowInsetsCompat.Type.systemBars())
        controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    }

    @Deprecated("Kiosk keeps the guest inside the order flow")
    override fun onBackPressed() {
        if (web.canGoBack()) web.goBack()
    }
}
