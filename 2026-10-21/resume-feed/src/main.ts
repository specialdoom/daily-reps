import { connectFeed } from "./feed";

const $ = (id: string) => document.getElementById(id) as HTMLElement;
let count = 0;
let gaps = 0;

const stop = connectFeed("/events", {
  onTick(t) {
    count++;
    $("count").textContent = String(count);
    $("last").textContent = String(t.id);
    const li = document.createElement("li");
    li.textContent = `#${t.id} ${t.symbol} ${t.price.toFixed(2)}`;
    $("log").prepend(li);
  },
  onStatus(s) {
    $("status").textContent = s;
  },
  onGap() {
    gaps++;
    $("gaps").textContent = String(gaps);
  },
});

window.addEventListener("pagehide", stop);
