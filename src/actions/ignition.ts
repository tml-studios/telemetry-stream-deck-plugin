import streamDeck, { Action, action, ActionContext, DialAction, KeyAction, KeyDownEvent, KeyUpEvent, SingletonAction, WillAppearEvent, WillDisappearEvent, type DidReceiveSettingsEvent} from "@elgato/streamdeck";
import { TelemetryManager, EventModeType, MonitoringType, getTelemetrieType } from "../core/TelemetryManager";
import { TML_Event_Base, TML_SettingsBase } from "../core/TML_ActionBase";



type IgnitionFunctionSettings = TML_SettingsBase & {
};

@action({ UUID: "com.tml-edition-gmbh.the-bus-telemetry-controller.ignitionfunctions" })
export class IgnitionFunctions extends TML_Event_Base {
    

    override onWillAppear(ev: WillAppearEvent<IgnitionFunctionSettings>): void | Promise<void> {
        super.onWillAppear(ev);
        const settings = ev.payload.settings;
        this.setSettings(settings, ev.action.id);
    }

    override onWillDisappear(ev: WillDisappearEvent<IgnitionFunctionSettings>): Promise<void> | void {
    }

    
    override async onKeyDown(ev: KeyDownEvent<IgnitionFunctionSettings>): Promise<void> {
        this.telemetryManager.sendEvent("MotorStartStop", "press");
    }

    override onKeyUp(ev: KeyUpEvent<IgnitionFunctionSettings>): Promise<void> | void {
        this.telemetryManager.sendEvent("MotorStartStop", "release");
    }

    override onDidReceiveSettings(ev: DidReceiveSettingsEvent<IgnitionFunctionSettings>): void {

        var Settings:IgnitionFunctionSettings = ev.payload.settings;
        this.setSettings(Settings, ev.action.id);
    }

    override onTelemetrypdate = (newVal: any, oldVal: any, actionId:string) => {
    }
}



