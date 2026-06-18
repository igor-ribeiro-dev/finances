-- 012b_recurring_card_profile
--
-- Lets a recurring bill (conta fixa) learn the payment method + credit card it
-- was last paid with, so future materialized instances inherit them (subscription
-- pre-fill). The instance itself stays PENDING; only creditCardId is copied as a
-- default (paymentMethod is set when the instance is actually paid).

-- AlterTable
ALTER TABLE "RecurringBill"
  ADD COLUMN "paymentMethod" "PaymentMethod",
  ADD COLUMN "creditCardId" TEXT;

-- CreateIndex
CREATE INDEX "recurring_bill_credit_card_idx" ON "RecurringBill"("creditCardId");

-- AddForeignKey: SET NULL so archiving/removing a card never blocks the template.
ALTER TABLE "RecurringBill" ADD CONSTRAINT "RecurringBill_creditCardId_fkey" FOREIGN KEY ("creditCardId") REFERENCES "CreditCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
