import { useCallback } from "react";
import { database } from "@/lib/firebase";
import { ref, set } from "firebase/database";

/**
 * Lightweight demo runner helper (client-side)
 * - Writes demo auto-trading session entry to Firebase under demo_auto_trades/{userId}/{id}
 * - Writes occasional simulated closed trades to trades/{userId}/{tradeId}
 *
 * NOTE: For production-grade demo, move simulation to a backend worker.
 *
 * This version avoids the 'uuid' dependency by using crypto.randomUUID() when available,
 * falling back to a secure-ish random string if not.
 */

const makeId = (): string => {
  try {
    // browser/node modern API
    // @ts-ignore - some TS libs may not include crypto.randomUUID in DOM lib
    if (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function") {
      // crypto.randomUUID() returns a UUID v4 string
      // prepend timestamp for readability/ordering
      return `${new Date().toISOString()}-${(crypto as any).randomUUID()}`;
    }
  } catch (e) {
    // ignore and fallback
  }

  // Fallback: timestamp + random string
  return `${new Date().toISOString()}-${Math.random().toString(36).slice(2, 10)}`;
};

const useDemoTrading = () => {
  const openDemoAutoTrading = useCallback(
    async ({ userId, symbol, market, startingBalance = 10000 }: any) => {
      if (!userId) throw new Error("User required");
      const id = makeId();
      const rec = {
        id,
        userId,
        symbol,
        market,
        startingBalance,
        status: "running",
        createdAt: new Date().toISOString(),
      };
      await set(ref(database, `demo_auto_trades/${userId}/${id}`), rec);

      // Simulate a few trades shortly after (simple, client-side)
      // In production, move simulation to backend worker for reliability.
      setTimeout(async () => {
        try {
          const tradeId = makeId();
          const side = Math.random() > 0.5 ? "buy" : "sell";
          // Generate a reasonable fake price and quantity
          const price = +(100 + Math.random() * 50).toFixed(2);
          const quantity = +(0.001 + Math.random() * 0.05).toFixed(6);
          const quoteAmount = +(price * quantity).toFixed(2);
          const pnl = +(((Math.random() - 0.5) * quoteAmount * 0.02).toFixed(4));

          const tradeRec = {
            id: tradeId,
            exchange: "demo",
            symbol,
            type: market === "spot" ? "spot" : "futures",
            side,
            quantity,
            quoteAmount,
            pnl,
            status: "closed",
            timestamp: new Date().toISOString(),
            orderIds: { demo: tradeId },
          };
          await set(ref(database, `trades/${userId}/${tradeId}`), tradeRec);
        } catch (err) {
          console.error("Demo trade write failed", err);
        }
      }, 3000 + Math.random() * 4000);

      return { id, success: true };
    },
    []
  );

  return { openDemoAutoTrading };
};

export default useDemoTrading;