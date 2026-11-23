import { shareCsvFile, stringifyCsv } from "@/services/csvService";
import type { Transaction } from "@/types/finance";

export async function shareTransactionSummaryCsv(
  transactions: Transaction[],
  months: 6 | 12,
): Promise<void> {
  const now = new Date();
  const rows: unknown[][] = [
    ["Periode", "Pemasukan", "Pengeluaran", "Saldo Bersih", "Jumlah Transaksi"],
  ];

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthTransactions = transactions.filter((transaction) =>
      transaction.date.startsWith(monthKey),
    );
    const income = monthTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const expenses = monthTransactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const label = new Intl.DateTimeFormat("id-ID", {
      month: "long",
      year: "numeric",
    }).format(date);
    rows.push([
      label,
      income,
      expenses,
      income - expenses,
      monthTransactions.length,
    ]);
  }

  const fileName = `finance_familia_rekap_${months}_bulan_${now.toISOString().slice(0, 10)}.csv`;
  await shareCsvFile(
    fileName,
    stringifyCsv(rows),
    `Bagikan rekap ${months} bulan`,
  );
}
