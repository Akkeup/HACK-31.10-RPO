// Shared by Vite's resource publisher and the compiled adapter selection.
export function resolveTransport(value) {
  const transport = value || "real";
  if (!["real", "mock"].includes(transport))
    throw Error("VITE_TRANSPORT must be real or mock");
  return transport;
}
