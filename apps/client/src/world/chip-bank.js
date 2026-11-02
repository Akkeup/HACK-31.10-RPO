// Exact integer denominations; the visual scene never estimates a monetary amount.
// Stake changes come only from validated competition.state messages.
export const CHIP_DENOMINATIONS = Object.freeze([500, 100, 25, 10, 5, 1]);
export function splitAura(amount) {
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > 50000)
    throw new RangeError("Aura amount must be an integer from 0 to 50000");
  let remaining = amount;
  const chips = [];
  for (const denomination of CHIP_DENOMINATIONS) {
    const count = Math.floor(remaining / denomination);
    for (let i = 0; i < count; i++) chips.push(denomination);
    remaining %= denomination;
  }
  return chips;
}
export const chipTotal = (chips) =>
  chips.reduce((sum, denomination) => sum + denomination, 0);
// Determine whether a complete wager was committed: ready reserves are not stakes.
export const newCommittedStakes = (before, after) => {
  if (
    !before ||
    before.lobbyId !== after.lobbyId ||
    before.status !== "lobby" ||
    after.status !== "running" ||
    !after.matchId ||
    after.potAura <= 0
  )
    return [];
  const players = (after.participants || []).filter((p) => p.ready && !p.left);
  const committed = players.map((p) => ({
    playerId: p.playerId,
    seatId: p.seatId,
    amount: after.stakeAura,
  }));
  return chipTotal(committed.map((p) => p.amount)) === after.potAura
    ? committed
    : [];
};
