ALTER TABLE "StaffUser" ALTER COLUMN "pin" DROP NOT NULL;
ALTER TABLE "StaffUser" ADD COLUMN "email" TEXT;
ALTER TABLE "StaffUser" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX "StaffUser_branchId_email_key" ON "StaffUser"("branchId", "email");
