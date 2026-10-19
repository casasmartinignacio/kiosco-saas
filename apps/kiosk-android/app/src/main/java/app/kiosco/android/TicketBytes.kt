package app.kiosco.android

import org.json.JSONObject

object TicketBytes {
    fun fromPayload(payload: String): ByteArray {
        val json = JSONObject(payload)
        val text = json.optString("text", payload).replace("₡", "C")
        val body = text.toByteArray(Charsets.ISO_8859_1)
        return byteArrayOf(0x1B, 0x40, 0x1B, 0x74, 0x02, 0x1B, 0x61, 0x00) +
            body +
            byteArrayOf(0x1B, 0x64, 0x04, 0x1D, 0x56, 0x42, 0x00)
    }
}
