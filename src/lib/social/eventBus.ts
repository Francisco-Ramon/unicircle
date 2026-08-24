import { SocialEvent, SocialEventType } from "./types";

type EventHandler<T = any> = (event: SocialEvent<T>) => Promise<void> | void;

export class EventBus {
  private static handlers: Map<SocialEventType, EventHandler[]> = new Map();
  private static processedIdempotencyKeys: Set<string> = new Set();
  private static eventLog: SocialEvent[] = [];

  /**
   * Register a subscriber for a social event type
   */
  static subscribe<T = any>(type: SocialEventType, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);

    return () => {
      const list = this.handlers.get(type);
      if (list) {
        this.handlers.set(type, list.filter((h) => h !== handler));
      }
    };
  }

  /**
   * Publish an event idempotently with retry safety
   */
  static async publish<T = any>(event: SocialEvent<T>): Promise<boolean> {
    // Idempotency check: Ignore duplicate events
    if (this.processedIdempotencyKeys.has(event.idempotencyKey)) {
      console.log(`[EventBus] Ignored duplicate event: ${event.type} (key: ${event.idempotencyKey})`);
      return false;
    }

    this.processedIdempotencyKeys.add(event.idempotencyKey);
    this.eventLog.push(event);

    console.log(`[EventBus] Publishing ${event.type} from actor ${event.actorId} (id: ${event.id})`);

    const handlers = this.handlers.get(event.type) || [];
    const results = await Promise.allSettled(
      handlers.map((h) => Promise.resolve(h(event)))
    );

    results.forEach((r, idx) => {
      if (r.status === "rejected") {
        console.error(`[EventBus] Handler ${idx} for ${event.type} failed:`, r.reason);
      }
    });

    return true;
  }

  static getEventHistory(): SocialEvent[] {
    return [...this.eventLog];
  }
}
