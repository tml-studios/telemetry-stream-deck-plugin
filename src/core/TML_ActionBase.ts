import streamDeck, {SingletonAction, WillAppearEvent, WillDisappearEvent,KeyDownEvent,KeyUpEvent,DidReceiveSettingsEvent,ActionContext,JsonObject, ActionService, DialAction, KeyAction} from "@elgato/streamdeck";
import { TelemetryManager, EventModeType, MonitoringType, getTelemetrieType } from "../core/TelemetryManager";


export type TML_SettingsBase = JsonObject & {
  Label?: string;
};

/**
 * Base Class for TML Telemetrie Actions
 */

export class TML_Event_Base<TSettings extends TML_SettingsBase = TML_SettingsBase> extends SingletonAction<TSettings> {

    protected telemetryManager = TelemetryManager.instance;

    protected storedSettings = new Map<string, TSettings>;

    override onWillAppear(ev: WillAppearEvent<TSettings>): void | Promise<void> {
        if(!TelemetryManager.instance.isInitialized())
        {
            const settings:any = streamDeck.settings.getGlobalSettings();
            const ip = String(settings.globalTargetIP || "127.0.0.1");
            const rawPort = settings.globalTargetPort;
            const port = parseInt(String(rawPort ?? "37337"), 10);
            TelemetryManager.instance.setTarget(ip, port);
        }
        this.settingsUpdated(ev.payload.settings, ev.action.id);
         streamDeck.logger.debug(`[Button] Will Appear`);
    }

    override onWillDisappear(ev: WillDisappearEvent<TSettings>): Promise<void> | void {
        streamDeck.logger.debug(`[Button] Will Disappear`);
    }

    
    override async onKeyDown(ev: KeyDownEvent<TSettings>): Promise<void> {
        streamDeck.logger.debug(`[Button] Key Down`);
    }

    override onKeyUp(ev: KeyUpEvent<TSettings>): Promise<void> | void {
        streamDeck.logger.debug(`[Button] Key Down`);
    }

    override onDidReceiveSettings(ev: DidReceiveSettingsEvent<TSettings>): void {
        this.settingsUpdated(ev.payload.settings, ev.action.id);
    }

    protected onTelemetrypdate = (newVal: any, oldVal: any, actionId:string) => {
        streamDeck.logger.debug(`[Button] Got Update from ${oldVal} to ${newVal}`);
        const foundAction = streamDeck.actions.find((action) => action.id == actionId)
        // Get the Action
    }

    protected setSettings(newSettings:TSettings, actionId:string)
    {
        this.storedSettings.set(actionId, newSettings);
    }

    protected getSettings(actionId:string):any
    {
        if(this.storedSettings.has(actionId))
            return this.storedSettings.get(actionId);
        return null;
    }

    protected settingsUpdated(newSettings:any, actionId:string)
    {
        streamDeck.logger.debug(`[Button] Updating Settings`);
        this.setSettings(newSettings, actionId);
        /** 
        if(this.storedSettings && this.storedSettings.MonitoringMode && this.storedSettings.MonitoringPath && this.storedSettings.MonitoringMode != "OFF")
        {
            // Unsubscribe from Telemetry
            this.telemetryManager.off(getTelemetrieType(this.storedSettings.MonitoringMode), this.storedSettings.MonitoringPath, actionId);
        }
        this.storedSettings = newSettings;
        
        if(this.storedSettings.MonitoringMode && this.storedSettings.MonitoringPath && this.storedSettings.MonitoringMode != "OFF")
        {
            // Subscribe to Telemetry
            this.telemetryManager.on(getTelemetrieType(this.storedSettings.MonitoringMode), this.storedSettings.MonitoringPath, this.onTelemetrypdate, actionId);
        }
        
        const foundAction = streamDeck.actions.find((action) => action.id == actionId)
        foundAction?.setTitle(newSettings.Label ?? "NONE")
        */
    }

    protected getAction(actionId:string) : DialAction<JsonObject> | KeyAction<JsonObject> | undefined
    {
        return streamDeck.actions.find((action) => action.id == actionId)??undefined;
    }
}
