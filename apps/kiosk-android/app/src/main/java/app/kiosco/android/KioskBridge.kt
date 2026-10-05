package app.kiosco.android

import android.webkit.JavascriptInterface
import org.json.JSONObject

class KioskBridge(
    private val payment: PaymentAdapter,
    private val printer: ReceiptPrinter,
) {
    @JavascriptInterface
    fun pay(payload: String): String {
        return try {
            val json = JSONObject(payload)
            val ok = payment.charge(json.optInt("amountCrc"), json.optString("method"))
            """{"ok":$ok}"""
        } catch (_: Exception) {
            """{"ok":false}"""
        }
    }

    @JavascriptInterface
    fun printTicket(payload: String): String {
        val ok = printer.print(payload)
        return """{"ok":$ok}"""
    }
}
