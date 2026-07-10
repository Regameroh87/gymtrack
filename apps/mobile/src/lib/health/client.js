// Fallback de Metro para plataformas sin health store (web): re-exporta el
// stub. En dispositivos, Metro resuelve client.ios.js / client.android.js.
export * from "./client.stub";
