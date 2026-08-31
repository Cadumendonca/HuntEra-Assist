(() => {
  if (window.__hunteraAssistBridge) return;
  window.__hunteraAssistBridge = true;
  const emit = async (direction, payload, url = "") => {
    try {
      if (payload instanceof Blob) {
        const bytes = new Uint8Array(await payload.arrayBuffer());
        payload = new TextDecoder().decode(bytes);
      } else if (payload instanceof ArrayBuffer || ArrayBuffer.isView(payload)) {
        const bytes = payload instanceof ArrayBuffer ? new Uint8Array(payload) : new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength);
        payload = new TextDecoder().decode(bytes);
      }
      window.dispatchEvent(new CustomEvent("huntera-assist-packet", { detail: { direction, payload, url, at: Date.now() } }));
    } catch (_) {}
  };
  const OriginalWebSocket = window.WebSocket;
  const wireNames = { 15: "creature-appear", 18: "creature-disappear", 20: "creature-hit", 22: "creature-outfit" };
  function xorWire(bytes, seed) {
    let state = (seed ^ 1213550164) >>> 0;
    if (state === 0) state = 1213550164;
    for (let index = 0; index < bytes.length; index++) {
      if ((index & 3) === 0) { state ^= state << 13; state >>>= 0; state ^= state >>> 17; state ^= state << 5; state >>>= 0; }
      bytes[index] ^= (state >>> ((index & 3) << 3)) & 255;
    }
  }
  async function inflateRaw(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  async function decodeWireFrame(input) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    if (bytes.length < 5) return [];
    const seed = (bytes[0] | bytes[1] << 8 | bytes[2] << 16 | bytes[3] << 24) >>> 0;
    const decoded = new Uint8Array(bytes.subarray(4));
    xorWire(decoded, seed);
    const flags = decoded[0], body = decoded.subarray(1);
    if ((flags & 2) !== 0) {
      const events = []; let offset = 0;
      while (offset + 4 <= body.length) {
        const size = (body[offset] | body[offset + 1] << 8 | body[offset + 2] << 16 | body[offset + 3] << 24) >>> 0;
        offset += 4;
        if (offset + size > body.length) break;
        events.push(...await decodeWireFrame(body.subarray(offset, offset + size)));
        offset += size;
      }
      return events;
    }
    let payloadBytes = body;
    if ((flags & 1) !== 0) payloadBytes = await inflateRaw(body);
    try {
      const packet = JSON.parse(new TextDecoder().decode(payloadBytes));
      if (!Array.isArray(packet) || packet.length !== 2 || typeof packet[0] !== "number" || !packet[1] || typeof packet[1] !== "object") return [];
      return [{ ...packet[1], type: wireNames[packet[0]] || `wire-${packet[0]}`, wireCode: packet[0] }];
    } catch (_) { return []; }
  }
  class ObservedWebSocket extends OriginalWebSocket {
    constructor(...args) { super(...args); this.addEventListener("message", event => { emit("in", event.data); try { const read = event.data instanceof Blob ? event.data.arrayBuffer() : Promise.resolve(event.data); read.then(data => decodeWireFrame(data)).then(events => events.forEach(item => emit("wire-event", JSON.stringify(item)))).catch(() => {}); } catch (_) {} }); }
    send(data) { emit("out", data); return super.send(data); }
  }
  Object.defineProperties(ObservedWebSocket, { CONNECTING:{value:0}, OPEN:{value:1}, CLOSING:{value:2}, CLOSED:{value:3} });
  window.WebSocket = ObservedWebSocket;

  const originalFetch = window.fetch;
  if (originalFetch) window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    try {
      const url = response.url || String(args[0]?.url || args[0] || "");
      const type = response.headers.get("content-type") || "";
      if (/json|text/i.test(type) && new URL(url, location.href).origin === location.origin) {
        response.clone().text().then(text => emit("fetch-in", text, url)).catch(() => {});
      }
    } catch (_) {}
    return response;
  };

  const OriginalXHR = window.XMLHttpRequest;
  if (OriginalXHR) {
    const open = OriginalXHR.prototype.open;
    const send = OriginalXHR.prototype.send;
    OriginalXHR.prototype.open = function (method, url, ...rest) {
      this.__hunteraAssistUrl = String(url || "");
      return open.call(this, method, url, ...rest);
    };
    OriginalXHR.prototype.send = function (...args) {
      this.addEventListener("load", () => {
        try {
          const type = this.getResponseHeader("content-type") || "";
          if (/json|text/i.test(type) && (this.responseType === "" || this.responseType === "text")) emit("xhr-in", this.responseText, this.responseURL || this.__hunteraAssistUrl);
          else if (this.responseType === "json") emit("xhr-in", JSON.stringify(this.response), this.responseURL || this.__hunteraAssistUrl);
        } catch (_) {}
      }, { once: true });
      return send.apply(this, args);
    };
  }

  const OriginalEventSource = window.EventSource;
  if (OriginalEventSource) {
    class ObservedEventSource extends OriginalEventSource {
      constructor(url, options) {
        super(url, options);
        this.addEventListener("message", event => emit("sse-in", event.data, String(url)));
      }
    }
    window.EventSource = ObservedEventSource;
  }

})();
