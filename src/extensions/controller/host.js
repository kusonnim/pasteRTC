import { Host as CoreHost } from "../../core/host.js";

const CONTROLLER_EVENTS = new Set(["button", "stick", "tilt"]);
const SUPPORTED_EVENTS = new Set([
  ...CoreHost.supportedEvents,
  ...CONTROLLER_EVENTS,
]);

/**
 * Host with optional controller event routing.
 */
export class Host extends CoreHost {
  static supportedEvents = SUPPORTED_EVENTS;

  /** @internal */
  _handleMessage(data, clientId) {
    let message;

    try {
      message = JSON.parse(data);
    } catch {
      return;
    }

    if (!message || !CONTROLLER_EVENTS.has(message.type)) {
      return;
    }

    this._emit(message.type, message, clientId);
  }
}
