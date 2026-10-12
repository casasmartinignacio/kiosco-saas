ALTER TABLE "Branch" ADD COLUMN "idleSeconds" INTEGER NOT NULL DEFAULT 90;
ALTER TABLE "Product" ADD COLUMN "stock" INTEGER;

ALTER TABLE "Order" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'KIOSK';
ALTER TABLE "Order" ADD COLUMN "terminalName" TEXT NOT NULL DEFAULT 'Kiosco 01';
ALTER TABLE "Order" ADD COLUMN "note" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Order" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "Order" ADD COLUMN "receiptKind" TEXT NOT NULL DEFAULT 'TICKET';
ALTER TABLE "Order" ADD COLUMN "customerName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Order" ADD COLUMN "customerTaxId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Order" ADD COLUMN "invoiceStatus" TEXT NOT NULL DEFAULT 'NOT_ISSUED';

ALTER TABLE "OrderItem" ADD COLUMN "note" TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX "Order_branchId_idempotencyKey_key" ON "Order"("branchId", "idempotencyKey");

CREATE TABLE "Terminal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Terminal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "orderId" TEXT,
    "detail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PagerAlert" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "pagerCode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PagerAlert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PagerAlert_orderId_key" ON "PagerAlert"("orderId");
CREATE INDEX "AuditEvent_branchId_createdAt_idx" ON "AuditEvent"("branchId", "createdAt");

ALTER TABLE "Terminal" ADD CONSTRAINT "Terminal_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PagerAlert" ADD CONSTRAINT "PagerAlert_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
