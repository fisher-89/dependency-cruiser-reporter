export function useWebSocket(url) {
  let connected = false;
  const listeners = [];

  return {
    connect() {
      connected = true;
    },
    disconnect() {
      connected = false;
      listeners.length = 0;
    },
    send(message) {
      if (!connected) throw new Error("Not connected");
      return { sent: true, message };
    },
    onMessage(callback) {
      listeners.push(callback);
    },
    isConnected() {
      return connected;
    },
  };
}
