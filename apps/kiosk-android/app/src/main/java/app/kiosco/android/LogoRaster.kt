package app.kiosco.android

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color

object LogoRaster {
    fun prepend(context: Context, ticket: ByteArray): ByteArray {
        val logo = raster(context)
        if (logo.isEmpty()) return ticket
        return byteArrayOf(0x1B, 0x61, 0x01) + logo + byteArrayOf(0x1B, 0x61, 0x00) + ticket
    }

    private fun raster(context: Context): ByteArray {
        val source = context.assets.open("logo-mark.png").use { BitmapFactory.decodeStream(it) } ?: return byteArrayOf()
        val width = 384
        val height = (source.height * width / source.width).coerceAtLeast(1)
        val scaled = Bitmap.createScaledBitmap(source, width, height, true)
        val bytesPerRow = (width + 7) / 8
        val pixels = ByteArray(bytesPerRow * height)
        for (y in 0 until height) {
            for (x in 0 until width) {
                val pixel = scaled.getPixel(x, y)
                val dark = Color.alpha(pixel) > 40 && (Color.red(pixel) + Color.green(pixel) + Color.blue(pixel)) / 3 < 180
                if (dark) {
                    val index = y * bytesPerRow + x / 8
                    pixels[index] = (pixels[index].toInt() or (0x80 shr (x % 8))).toByte()
                }
            }
        }
        return byteArrayOf(
            0x1D,
            0x76,
            0x30,
            0x00,
            (bytesPerRow and 0xFF).toByte(),
            ((bytesPerRow shr 8) and 0xFF).toByte(),
            (height and 0xFF).toByte(),
            ((height shr 8) and 0xFF).toByte(),
        ) + pixels + byteArrayOf(0x0A)
    }
}
