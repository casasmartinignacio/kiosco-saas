package app.kiosco.android

import android.webkit.JavascriptInterface
import org.json.JSONObject

class KioskBridge(
    private val config: DeviceConfig,
    private val payment: PaymentAdapter,
    private val printer: ReceiptPrinter,
    private val allowed: () -> Boolean,
) {
    @JavascriptInterface
    fun configure(payload: String) {
        if (!allowed()) return
        val json = JSONObject(payload)
        config.terminalUrl = json.optString("terminalUrl")
        config.printers = json.optJSONArray("printers")?.toString() ?: "[]"
        config.printerHost = json.optJSONArray("printers")?.optJSONObject(0)?.optString("host") ?: ""
    }

    @JavascriptInterface
    fun listPrinters(): String = if (allowed()) printerList(config) else "[]"

    @JavascriptInterface
    fun pay(payload: String): String {
        if (!allowed()) return """{"ok":false,"message":"No autorizado."}"""
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
        if (!allowed()) return """{"ok":false}"""
        val ok = printer.print(payload)
        return """{"ok":$ok}"""
    }
}
