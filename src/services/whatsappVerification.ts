import { Linking } from "react-native";

import { createId } from "@/utils/ids";

export type VerificationRecipient = "self" | "partner";

export function createVerificationCode(): string {
  const randomValue = Number.parseInt(
    createId().replace(/-/g, "").slice(0, 8),
    16,
  );
  return String(randomValue % 1_000_000).padStart(6, "0");
}

export async function openWhatsAppVerification(
  phone: string,
  code: string,
  recipient: VerificationRecipient,
): Promise<void> {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    throw new Error("Masukkan nomor WhatsApp dengan kode negara yang valid.");
  }

  const instruction =
    recipient === "self"
      ? "Kirim pesan ini ke chat WhatsApp Anda sendiri, lalu masukkan kode dari pesan tersebut ke aplikasi."
      : "Minta pasangan membalas kode ini, lalu masukkan kode balasan ke aplikasi.";
  const message = `Finance Familia\n\nKode konfirmasi: ${code}\n\n${instruction}\n\nKonfirmasi ini dilakukan manual. Aplikasi tidak dapat membaca status terkirim atau pesan WhatsApp.`;
  await Linking.openURL(
    `https://wa.me/${digits}?text=${encodeURIComponent(message)}`,
  );
}
