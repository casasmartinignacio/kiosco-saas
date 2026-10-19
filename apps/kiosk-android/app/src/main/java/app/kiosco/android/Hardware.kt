package app.kiosco.android

import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.InetSocketAddress
import java.net.Socket
import java.net.URL

data class ChargeResult(val ok: Boolean, val message: String = "")

class DeviceConfig {
    @Volatile var terminalUrl: String = ""
    @Volatile var printerHost: String = ""
    @Volatile var printers: String = "[]"
}

interface PaymentAdapter {
    fun charge(amountCrc: Int, method: String, reference: String): ChargeResult
}

interface ReceiptPrinter {
    fun print(payload: String): Boolean
}

class WifiPayment(private val config: DeviceConfig) : PaymentAdapter {
    override fun charge(amountCrc: Int, method: String, reference: String): ChargeResult {
        if (method != "CARD" || config.terminalUrl.isBlank()) return ChargeResult(true)
        return try {
            val connection = URL(config.terminalUrl.trimEnd('/') + "/v1/charge").openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.connectTimeout = 8000
            connection.readTimeout = 45000
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.outputStream.use { stream ->
                stream.write("""{"amount":$amountCrc,"currency":"CRC","reference":${JSONObject.quote(reference)},"method":"CARD"}""".toByteArray())
            }
            val body = connection.inputStream.bufferedReader().readText()
            val json = JSONObject(body)
            ChargeResult(connection.responseCode in 200..299 && json.optBoolean("approved"), json.optString("message"))
        } catch (_: Exception) {
            ChargeResult(false, "El datáfono no respondió.")
        }
    }
}

class LanPrinter(private val config: DeviceConfig) : ReceiptPrinter {
    override fun print(payload: String): Boolean {
        val json = JSONObject(payload)
        val host = json.optString("host").ifBlank { config.printerHost }
        if (host.isBlank()) return false
        val parts = host.split(":")
        val port = parts.getOrNull(1)?.toIntOrNull() ?: 9100
        return try {
            Socket().use { socket ->
                socket.connect(InetSocketAddress(parts[0], port), 4000)
                socket.soTimeout = 4000
                socket.getOutputStream().use { out -> out.write(TicketBytes.fromPayload(payload)) }
            }
            true
        } catch (_: Exception) {
            false
        }
    }
}

class StorePrinter(private val usb: UsbEscPosPrinter, private val lan: LanPrinter) : ReceiptPrinter {
    fun prepare() = usb.requestAccess()

    fun needsAccess() = usb.needsAccess()

    override fun print(payload: String): Boolean {
        if (usb.isAvailable()) return usb.print(payload)
        return lan.print(payload)
    }
}

fun printerList(config: DeviceConfig): String {
    return try {
        val list = JSONArray(config.printers)
        if (list.length() == 0 && config.printerHost.isNotBlank()) {
            JSONArray().put(JSONObject().put("name", "Impresora").put("host", config.printerHost)).toString()
        } else config.printers
    } catch (_: Exception) {
        "[]"
    }
}
