import { useCallback } from "react";
import { database } from "@/lib/firebase";
import { ref, set } from "firebase/database";
import { v4 as uuidv4 } from "uuid";

/**
 * Lightweight demo runner helper (client-side)
 * - Writes demo auto-trading session entry to Firebase under demo_auto_trades/{userId}/{id}
 * - Writes occasional simulated closed trades to trades/{userId}/{tradeId}
 *
 * NOTE: For production-grade demo, move simulation to a backend worker.
 */

const useDemoTrading = () => {
  const openDemoAutoTrading = useCallback(
    async ({ userId, symbol, market, startingBalance = 10000 }: any) => {
      if (!userId) throw new Error("User required");
      const id = `${new Date().toISOString()}-${uuidv4()}`;
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
      setTimeout(async () => {
        try {
          const tradeId = `${new Date().toISOString()}-${uuidv4()}`;
          const side = Math.random() > 0.5 ? "buy" : "sell";
          const price = +(100 + Math.random() * 50).toFixed(2); // fake price
          const quantity = +(0.001 + Math.random() * 0.05).toFixed(6);
          const quoteAmount = +(price * quantity).toFixed(2);
          const pnl = +( (Math.random() - 0.5) * quoteAmount * 0.02 ).toFixed(4);

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