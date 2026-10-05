package app.kiosco.android

interface PaymentAdapter {
    fun charge(amountCrc: Int, method: String): Boolean
}

interface ReceiptPrinter {
    fun print(ticket: String): Boolean
}

class AcceptingPayment : PaymentAdapter {
    override fun charge(amountCrc: Int, method: String) = true
}

class QuietPrinter : ReceiptPrinter {
    override fun print(ticket: String) = true
}
