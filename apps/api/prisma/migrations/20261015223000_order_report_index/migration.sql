CREATE INDEX "Order_branchId_createdAt_idx" ON "Order"("branchId", "createdAt");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
