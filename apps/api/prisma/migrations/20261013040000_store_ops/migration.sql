ALTER TABLE "Order" ADD COLUMN "customerCode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Order" ADD COLUMN "discountCrc" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "promotionName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AuditEvent" ADD COLUMN "actorName" TEXT NOT NULL DEFAULT '';

CREATE TABLE "StaffUser" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StaffUser_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'u',
    "stock" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecipeLine" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "RecipeLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RegisterShift" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "terminalName" TEXT NOT NULL,
    "openedBy" TEXT NOT NULL,
    "closedBy" TEXT NOT NULL DEFAULT '',
    "openingCashCrc" INTEGER NOT NULL,
    "closingCashCrc" INTEGER,
    "expectedCashCrc" INTEGER,
    "note" TEXT NOT NULL DEFAULT '',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    CONSTRAINT "RegisterShift_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffUser_branchId_pin_key" ON "StaffUser"("branchId", "pin");
CREATE UNIQUE INDEX "Customer_branchId_code_key" ON "Customer"("branchId", "code");
CREATE UNIQUE INDEX "RecipeLine_productId_ingredientId_key" ON "RecipeLine"("productId", "ingredientId");

ALTER TABLE "StaffUser" ADD CONSTRAINT "StaffUser_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecipeLine" ADD CONSTRAINT "RecipeLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecipeLine" ADD CONSTRAINT "RecipeLine_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegisterShift" ADD CONSTRAINT "RegisterShift_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
