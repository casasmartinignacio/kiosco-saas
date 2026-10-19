package app.kiosco.android

import android.annotation.SuppressLint
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import android.os.UserManager
import android.view.View
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private lateinit var offline: View
    private lateinit var maintenance: View
    private lateinit var maintenanceActions: View
    private lateinit var maintenanceConfirm: View
    private lateinit var maintenanceMessage: TextView
    private lateinit var maintenanceEmail: EditText
    private lateinit var maintenancePassword: EditText

    @Volatile private var pageHost: String? = null
    private var maintenanceOpen = false
    private var taps = 0
    private var firstTap = 0L

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        hideSystemBars()
        window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        getSharedPreferences("kiosk", MODE_PRIVATE).edit().remove("url").apply()
        enterKioskMode()

        web = findViewById(R.id.web)
        offline = findViewById(R.id.offline)
        maintenance = findViewById(R.id.maintenance)
        maintenanceActions = findViewById(R.id.maintenance_actions)
        maintenanceConfirm = findViewById(R.id.maintenance_confirm)
        maintenanceMessage = findViewById(R.id.maintenance_message)
        maintenanceEmail = findViewById(R.id.maintenance_email)
        maintenancePassword = findViewById(R.id.maintenance_password)

        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.mediaPlaybackRequiresUserGesture = false
        web.setBackgroundColor(android.graphics.Color.WHITE)
        val devices = DeviceConfig()
        web.addJavascriptInterface(KioskBridge(devices, WifiPayment(devices), LanPrinter(devices), ::pageAllowed), "Kiosk")
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                return request.url.host != officialHost()
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                pageHost = url?.let { Uri.parse(it).host }
                offline.visibility = View.GONE
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) showOffline()
            }
        }

        findViewById<Button>(R.id.retry).setOnClickListener { load() }
        findViewById<View>(R.id.maintenance_tap).setOnClickListener { countMaintenanceTap() }
        findViewById<Button>(R.id.maintenance_check).setOnClickListener { checkMaintenance() }
        findViewById<Button>(R.id.maintenance_unlock).setOnClickListener { leaveLock() }
        findViewById<Button>(R.id.maintenance_clear_owner).setOnClickListener {
            maintenanceConfirm.visibility = View.VISIBLE
        }
        findViewById<Button>(R.id.maintenance_clear_confirm).setOnClickListener { clearOwner() }
        findViewById<Button>(R.id.maintenance_back).setOnClickListener { closeMaintenance() }
        load()
    }

    private fun officialHost(): String = Uri.parse(getString(R.string.kiosk_url)).host.orEmpty()

    private fun pageAllowed(): Boolean = pageHost == officialHost()

    private fun countMaintenanceTap() {
        if (maintenance.visibility == View.VISIBLE) return
        val now = SystemClock.uptimeMillis()
        if (now - firstTap > 4000) taps = 0
        if (taps == 0) firstTap = now
        taps += 1
        if (taps >= 5) {
            taps = 0
            openMaintenance()
        }
    }

    private fun openMaintenance() {
        maintenanceEmail.setText("")
        maintenancePassword.setText("")
        maintenanceMessage.text = ""
        maintenanceActions.visibility = View.GONE
        maintenanceConfirm.visibility = View.GONE
        maintenance.visibility = View.VISIBLE
    }

    private fun checkMaintenance() {
        val email = maintenanceEmail.text.toString().trim()
        val password = maintenancePassword.text.toString()
        maintenancePassword.setText("")
        if (email.isEmpty() || password.isEmpty()) {
            maintenanceMessage.setText(R.string.maintenance_denied)
            return
        }
        findViewById<Button>(R.id.maintenance_check).isEnabled = false
        maintenanceMessage.text = ""
        Thread {
            val result = verifyAdmin(email, password)
            runOnUiThread {
                findViewById<Button>(R.id.maintenance_check).isEnabled = true
                when (result) {
                    "ok" -> {
                        maintenanceActions.visibility = View.VISIBLE
                        maintenanceMessage.text = ""
                    }
                    "offline" -> maintenanceMessage.setText(R.string.maintenance_offline)
                    else -> maintenanceMessage.setText(R.string.maintenance_denied)
                }
            }
        }.start()
    }

    private fun verifyAdmin(email: String, password: String): String {
        return try {
            val connection = URL(getString(R.string.kiosk_url) + "/api/acceso").openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.connectTimeout = 8000
            connection.readTimeout = 8000
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.outputStream.use { stream ->
                stream.write(JSONObject().put("email", email).put("password", password).toString().toByteArray())
            }
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val body = stream?.bufferedReader()?.readText().orEmpty()
            if (code == 200 && JSONObject(body).optString("role") == "ADMIN") "ok" else "denied"
        } catch (_: Exception) {
            "offline"
        }
    }

    private fun leaveLock() {
        maintenanceOpen = true
        try {
            stopLockTask()
        } catch (_: IllegalArgumentException) {
        }
        val dpm = getSystemService(DevicePolicyManager::class.java)
        val admin = ComponentName(this, KioskAdminReceiver::class.java)
        if (dpm != null && dpm.isDeviceOwnerApp(packageName)) {
            try {
                dpm.setStatusBarDisabled(admin, false)
                dpm.clearPackagePersistentPreferredActivities(admin, packageName)
            } catch (_: SecurityException) {
            }
        }
        showSystemBars()
        maintenanceMessage.setText(R.string.maintenance_unlocked)
    }

    private fun clearOwner() {
        maintenanceOpen = true
        val dpm = getSystemService(DevicePolicyManager::class.java)
        val admin = ComponentName(this, KioskAdminReceiver::class.java)
        try {
            stopLockTask()
        } catch (_: IllegalArgumentException) {
        }
        if (dpm != null && dpm.isDeviceOwnerApp(packageName)) {
            try {
                dpm.clearUserRestriction(admin, UserManager.DISALLOW_SAFE_BOOT)
                dpm.clearUserRestriction(admin, UserManager.DISALLOW_ADD_USER)
                dpm.setStatusBarDisabled(admin, false)
                dpm.setKeyguardDisabled(admin, false)
                dpm.clearPackagePersistentPreferredActivities(admin, packageName)
                dpm.clearDeviceOwnerApp(packageName)
            } catch (_: SecurityException) {
                showSystemBars()
                maintenanceMessage.setText(R.string.maintenance_clear_failed)
                return
            }
        }
        showSystemBars()
        maintenanceConfirm.visibility = View.GONE
        findViewById<Button>(R.id.maintenance_clear_owner).visibility = View.GONE
        maintenanceMessage.setText(R.string.maintenance_cleared)
    }

    private fun closeMaintenance() {
        maintenanceOpen = false
        maintenance.visibility = View.GONE
        maintenancePassword.setText("")
        hideSystemBars()
        enterKioskMode()
    }

    private fun currentUrl(): String = getString(R.string.kiosk_url)

    private fun load() {
        offline.visibility = View.GONE
        web.loadUrl(currentUrl())
    }

    private fun showOffline() {
        offline.visibility = View.VISIBLE
    }

    override fun onResume() {
        super.onResume()
        if (!maintenanceOpen) enterKioskMode()
    }

    private fun enterKioskMode() {
        if (maintenanceOpen) return
        try {
            val dpm = getSystemService(DevicePolicyManager::class.java) ?: return
            val admin = ComponentName(this, KioskAdminReceiver::class.java)
            if (dpm.isDeviceOwnerApp(packageName)) {
                dpm.setLockTaskPackages(admin, arrayOf(packageName))
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    dpm.setLockTaskFeatures(admin, DevicePolicyManager.LOCK_TASK_FEATURE_NONE)
                }
                dpm.addUserRestriction(admin, UserManager.DISALLOW_SAFE_BOOT)
                dpm.addUserRestriction(admin, UserManager.DISALLOW_ADD_USER)
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

    private fun showSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(window, true)
        WindowInsetsControllerCompat(window, window.decorView).show(WindowInsetsCompat.Type.systemBars())
    }

    @Deprecated("Kiosk keeps the guest inside the order flow")
    override fun onBackPressed() {
        if (maintenance.visibility == View.VISIBLE) return
        if (web.canGoBack()) web.goBack()
    }
}
