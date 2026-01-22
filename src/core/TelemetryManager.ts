// core/TelemetryManager.ts
import deepEqual from "fast-deep-equal"; // Optional: npm i fast-deep-equal
import streamDeck, { action, Action, ActionContext, DialAction, KeyAction, LogLevel } from "@elgato/streamdeck";
import { json } from "stream/consumers";

type TelemetryType = "player" | "vehicle";
type TelemetryCallback = (newValue: any, oldValue: any, action: string) => void;

export type MonitoringType = "OFF" | "Player" | "Vehicle";
export type EventModeType = "Event" | "Command";
export type EventSendMode = "press" | "release" | "push";
export function getTelemetrieType(Mode:MonitoringType):TelemetryType
{
  switch (Mode) {
    case "Vehicle":
      return "vehicle"
    default:
      return "player";
  }
}

enum TelemetryRequestState {
  READY_FOR_PLAYER_REQUEST = "READY_FOR_PLAYER_REQUEST",
  REQUESTING_PLAYER = "REQUESTING_PLAYER",
  READY_FOR_VEHICLE_REQUEST = "READY_FOR_VEHICLE_REQUEST",
  REQUESTING_VEHICLE = "REQUESTING_VEHICLE",
}

interface Subscriber {
  type: TelemetryType;
  path: string; // dot-notation key path, e.g. "stats.health"
  callback: TelemetryCallback;
  actionId: string;
}

export class TelemetryManager {
  private static _instance: TelemetryManager;
  private subscribers: Subscriber[] = [];
  private state: TelemetryRequestState = TelemetryRequestState.READY_FOR_PLAYER_REQUEST;
  private pollingInterval?: ReturnType<typeof setInterval>;
  private cache: Record<"player" | "vehicle", any> = { player: null, vehicle: null };
  private Inititialized: boolean = false;
  private currentVehicleId: string = "";

  private ip: string = "127.0.0.1";
  private port: number = 37337;

  private constructor() {}

  public isInitialized() {
    return this.Inititialized;
  }

  public static get instance(): TelemetryManager {
    if (!this._instance) {
      this._instance = new TelemetryManager();
    }
    return this._instance;
  }

  public setTarget(ip: string, port: number) {
    if (ip !== this.ip || port !== this.port) {
      streamDeck.logger.debug(`[TelemetryManager] Target updated: ${ip}:${port}`);
      this.ip = ip;
      this.port = port;
      this.Inititialized = true;
    }
  }

  private get baseUrl() {
    return `http://${this.ip}:${this.port}`;
  }

  /** Subscribe to updates of a specific key/path within player or vehicle telemetry */
  on(
    type: TelemetryType,
    path: string,
    callback: TelemetryCallback,
    actionId: string
  ): void {
    this.subscribers.push({ type, path, callback, actionId });
    this.cache.vehicle = "";
    this.cache.player = "";
    streamDeck.logger.debug(`[TelemetryManager] new Subscriber: ${path}  - Active Subscribers: ${this.subscribers.length}`);
  }

  /** Unsubscribe */
  off(type: TelemetryType, path: string, actionId: string): void { 
    this.subscribers = this.subscribers.filter(
      s => !(s.type === type && s.path === path && s.actionId === actionId)
    );
    streamDeck.logger.debug(`[TelemetryManager] removed Subscriber: ${path}  - Active Subscribers: ${this.subscribers.length}`);
  }


  startPolling(intervalMs = 100) {
    if (this.pollingInterval) return;
    this.pollingInterval = setInterval(() => this.updateLoop(), intervalMs);
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
  }

  getCurrentVehicleUrl()
  {
    if(!this.currentVehicleId)
      return undefined;

    return `${this.baseUrl}/vehicles/${this.currentVehicleId}`;
  }

  getPlayerUrl()
  {
    return `${this.baseUrl}/player`;
  }

  /** Fetch player, then vehicle if applicable */
  private async updateLoop() {
    switch (this.state) {
      case TelemetryRequestState.READY_FOR_PLAYER_REQUEST:
        await this.requestPlayer();
        break;

      case TelemetryRequestState.READY_FOR_VEHICLE_REQUEST:
        await this.requestVehicle();
        break;

      case TelemetryRequestState.REQUESTING_PLAYER:
      case TelemetryRequestState.REQUESTING_VEHICLE:
      // Currently fetching — skip this tick
        break;
    }
  }

  private async requestPlayer() {
    this.state = TelemetryRequestState.REQUESTING_PLAYER;
    try {
      const playerData: any = await this.fetchJson("player");
      const prevPlayer = this.cache.player;
      this.cache.player = playerData;
      this.notifyIfChanged("player", playerData, prevPlayer);

      const vehicleId = playerData?.CurrentVehicle;
      if (vehicleId) {
        this.state = TelemetryRequestState.READY_FOR_VEHICLE_REQUEST;
        this.currentVehicleId =vehicleId
      } else {
        this.currentVehicleId = "";
        this.cache.vehicle = "";
        this.state = TelemetryRequestState.READY_FOR_PLAYER_REQUEST;
      }
    } catch (err) {
      streamDeck.logger.error("[TelemetryManager] Player request failed:", err);
      this.state = TelemetryRequestState.READY_FOR_PLAYER_REQUEST; // retry later
    }
  }

  private async requestVehicle() {
    this.state = TelemetryRequestState.REQUESTING_VEHICLE;
    try {
      var vehicleData:any = await this.fetchJson("vehicle", this.currentVehicleId);
      // Normalize buttons: convert array → map by Name
      if (Array.isArray(vehicleData.Buttons)) {
        const buttonMap: Record<string, any> = {};
        for (const btn of vehicleData.Buttons) {
          if (btn?.Name) buttonMap[btn.Name] = btn;
        }
        vehicleData.Buttons = buttonMap;
      }
      const prevVehicle = this.cache.vehicle;
      this.cache.vehicle = vehicleData;
      this.notifyIfChanged("vehicle", vehicleData, prevVehicle);
    } catch (err) {
      streamDeck.logger.error("[TelemetryManager] Vehicle request failed:", err);
      this.state = TelemetryRequestState.READY_FOR_PLAYER_REQUEST;
    } finally {
      // After vehicle fetch, always return to player request
      this.state = TelemetryRequestState.READY_FOR_PLAYER_REQUEST;
    }
  }

  async sendEvent(event:string, mode:EventSendMode)
  {
    if(!this.currentVehicleId)
      return;
    switch (mode) {
      case "press":
        this.sendToTelemetrie(`vehicles/${this.currentVehicleId}/sendeventpress?event=${event}`);
        break;
      case "release":
        this.sendToTelemetrie(`vehicles/${this.currentVehicleId}/sendeventrelease?event=${event}`);
        break;
      case "push":
        this.sendToTelemetrie(`vehicles/${this.currentVehicleId}/sendevent?event=${event}`);
      default:
        break;
    }
  }

  async sendCommand(command:string)
  {
    if(this.currentVehicleId)
      this.sendToTelemetrie(`command?Command=${command}`);
  }

  /** GET request to a REST endpoint */
  private async fetchJson(type: "player" | "vehicle", id?: string) {
    var url = id ? `${this.baseUrl}/${type}/${id}` : `${this.baseUrl}/${type}`;
    if(type=="vehicle")
      url = id ? `${this.baseUrl}/vehicles/${id}` : `${this.baseUrl}/${type}`;
    //streamDeck.logger.debug("[TelemetryManager] Fetching:", url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${type}: ${res.statusText}`);
    return res.json();
  }

  /** GET request to a REST endpoint */
  private async sendToTelemetrie(payload: string) {
    var url = `${this.baseUrl}/${payload}`
    const res = await fetch(url);
    streamDeck.logger.debug("[TelemetryManager] Sending:", url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  }

  /** Compare current and previous cache, and notify relevant subscribers */
  private notifyIfChanged(
    type: TelemetryType,
    newData: any,
    oldData: any
  ) {
    if (!newData) return;

    this.subscribers
      .filter(sub => sub.type === type)
      .forEach(sub => {
        const newValue = this.resolvePath(newData, sub.path);
        const oldValue = oldData ? this.resolvePath(oldData, sub.path) : undefined;
        if (!deepEqual(newValue, oldValue)) {
          sub.callback(newValue, oldValue, sub.actionId);
          streamDeck.logger.debug("[TelemetryManager] FoundChange:", sub.path);
        }
      });
  }

  /** Resolve "foo.bar.baz" style paths into object values */
  private resolvePath(obj: any, path: string): any {
    if (!path) return obj;

    // Convert [number] and ["string"] to dots
    const normalized = path.replace(/\[["']?(.+?)["']?\]/g, '.$1');
    const keys = normalized.split(".");

    let current = obj;
    for (const key of keys) {
      if (current == null) return undefined;
      const normalizedKey = Object.keys(current).find(
        k => k.toLowerCase() === key.toLowerCase()
      );
      current = normalizedKey ? current[normalizedKey] : undefined;
    }
    return current;
  }
}
