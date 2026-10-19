package app.kiosco.android

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager

class UsbEscPosPrinter(private val context: Context) : ReceiptPrinter {
    fun isAvailable(): Boolean = printerDevice() != null

    fun needsAccess(): Boolean {
        val device = printerDevice() ?: return false
        return !manager().hasPermission(device)
    }

    fun requestAccess() {
        val device = printerDevice() ?: return
        val usb = manager()
        if (usb.hasPermission(device)) return
        val pending = PendingIntent.getBroadcast(
            context,
            0,
            Intent(ACTION).setPackage(context.packageName),
            PendingIntent.FLAG_IMMUTABLE,
        )
        usb.requestPermission(device, pending)
    }

    fun write(bytes: ByteArray): Boolean {
        val usb = manager()
        val device = printerDevice() ?: return false
        if (!usb.hasPermission(device)) {
            requestAccess()
            return false
        }
        val link = device.printerInterface() ?: return false
        val connection = usb.openDevice(device) ?: return false
        return try {
            if (!connection.claimInterface(link.intf, true)) return false
            var offset = 0
            while (offset < bytes.size) {
                val wrote = connection.bulkTransfer(link.out, bytes, offset, minOf(4096, bytes.size - offset), 4000)
                if (wrote <= 0) return false
                offset += wrote
            }
            true
        } catch (_: Exception) {
            false
        } finally {
            connection.close()
        }
    }

    override fun print(payload: String) = write(TicketBytes.fromPayload(payload))

    private fun manager(): UsbManager = context.getSystemService(UsbManager::class.java)

    private fun printerDevice(): UsbDevice? {
        return manager().deviceList.values.firstOrNull { device ->
            device.deviceClass == UsbConstants.USB_CLASS_PRINTER || device.printerInterface() != null
        }
    }

    private fun UsbDevice.printerInterface(): PrinterLink? {
        for (index in 0 until interfaceCount) {
            val intf = getInterface(index)
            if (intf.interfaceClass != UsbConstants.USB_CLASS_PRINTER && deviceClass != UsbConstants.USB_CLASS_PRINTER) continue
            val out = (0 until intf.endpointCount)
                .map { intf.getEndpoint(it) }
                .firstOrNull { it.direction == UsbConstants.USB_DIR_OUT && it.type == UsbConstants.USB_ENDPOINT_XFER_BULK }
            if (out != null) return PrinterLink(intf, out)
        }
        return null
    }

    private class PrinterLink(val intf: UsbInterface, val out: UsbEndpoint)

    companion object {
        const val ACTION = "app.kiosco.android.USB_PRINTER"
    }
}
