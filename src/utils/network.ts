export function getNetworkLabel(
  isConnected?: boolean,
  type?: string,
): string {
  if (isConnected === undefined) return "Memeriksa jaringan...";
  if (!isConnected) return "Offline";

  switch (type) {
    case "WIFI":
      return "Online · Wi-Fi";
    case "CELLULAR":
      return "Online · Data seluler";
    case "ETHERNET":
      return "Online · Ethernet";
    default:
      return "Online · Jaringan tersedia";
  }
}
