package app.kiosco.android

import android.webkit.JavascriptInterface
import org.json.JSONObject

class KioskBridge(
    private val config: DeviceConfig,
    private val payment: PaymentAdapter,
    private val printer: ReceiptPrinter,
) {
    @JavascriptInterface
    fun configure(payload: String) {
        val json = JSONObject(payload)
        config.terminalUrl = json.optString("terminalUrl")
        config.printers = json.optJSONArray("printers")?.toString() ?: "[]"
        config.printerHost = json.optJSONArray("printers")?.optJSONObject(0)?.optString("host") ?: ""
    }

    @JavascriptInterface
    fun listPrinters(): String = printerList(config)

    @JavascriptInterface
    fun pay(payload: String): String {
        return try {
            val json = JSONObject(payload)
            val result = payment.charge(json.optInt("amountCrc"), json.optString("method"), json.optString("reference"))
            """{"ok":${result.ok},"message":${JSONObject.quote(result.message)}}"""
        } catch (_: Exception) {
            """{"ok":false,"message":"No se pudo cobrar."}"""
        }
    }

    @JavascriptInterface
    fun printTicket(payload: String): String {
        val ok = printer.print(payload)
        return """{"ok":$ok}"""
    }
}
