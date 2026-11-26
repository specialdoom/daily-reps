// Given. A fake chat connection: do not change.
export type Message = { id: number; text: string };
export type Connection = { disconnect(): void };

export const stats = { connects: 0, disconnects: 0 };

export function connectToRoom(
  roomId: string,
  onMessage: (message: Message) => void,
): Connection {
  stats.connects++;
  let id = 0;
  const timer = setInterval(() => {
    id++;
    onMessage({ id, text: `#${roomId} message ${id}` });
  }, 1500);
  return {
    disconnect() {
      stats.disconnects++;
      clearInterval(timer);
    },
  };
}
