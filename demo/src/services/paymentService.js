import { generateId } from "../utils/helpers.js";
import { isNotEmpty } from "../utils/validators.js";

const payments = [];

export function createPayment(userId, amount, currency = "USD") {
  if (!isNotEmpty(userId)) throw new Error("User ID is required");
  if (amount <= 0) throw new Error("Amount must be positive");
  const payment = { id: generateId(), userId, amount, currency, status: "pending", createdAt: new Date() };
  payments.push(payment);
  return payment;
}

export function processPayment(paymentId) {
  const payment = payments.find((p) => p.id === paymentId);
  if (!payment) throw new Error("Payment not found");
  payment.status = "completed";
  return payment;
}

export function refundPayment(paymentId) {
  const payment = payments.find((p) => p.id === paymentId);
  if (!payment) throw new Error("Payment not found");
  payment.status = "refunded";
  return payment;
}
