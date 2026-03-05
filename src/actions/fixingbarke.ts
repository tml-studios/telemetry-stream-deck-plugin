import streamDeck, { Action, action, ActionContext, DialAction, KeyAction, KeyDownEvent, KeyUpEvent, SingletonAction, WillAppearEvent, WillDisappearEvent, type DidReceiveSettingsEvent} from "@elgato/streamdeck";
import { TelemetryManager, EventModeType, MonitoringType, getTelemetrieType } from "../core/TelemetryManager";
import { TML_Event_Base, TML_SettingsBase } from "../core/TML_ActionBase";



type FixingBrakeFunctionsSettings = TML_SettingsBase & {
};

@action({ UUID: "com.tml-edition-gmbh.the-bus-telemetry-controller.fixingbrakefunctions" })
export class FixingBrakeFunctions extends TML_Event_Base {
    

    override onWillAppear(ev: WillAppearEvent<FixingBrakeFunctionsSettings>): void | Promise<void> {
        super.onWillAppear(ev);
        const settings = ev.payload.settings;
        this.setSettings(settings, ev.action.id);
        TelemetryManager.instance.on("vehicle", "FixingBrake", this.onTelemetrypdate, ev.action.id);
    }

    override onWillDisappear(ev: WillDisappearEvent<FixingBrakeFunctionsSettings>): Promise<void> | void {
        TelemetryManager.instance.off("vehicle", "FixingBrake", ev.action.id);
    }

    
    override async onKeyDown(ev: KeyDownEvent<FixingBrakeFunctionsSettings>): Promise<void> {
        this.telemetryManager.sendEvent("FixingBrake", "press");
    }

    override onKeyUp(ev: KeyUpEvent<FixingBrakeFunctionsSettings>): Promise<void> | void {
        this.telemetryManager.sendEvent("FixingBrake", "release");
    }

    override onDidReceiveSettings(ev: DidReceiveSettingsEvent<FixingBrakeFunctionsSettings>): void {

        var Settings:FixingBrakeFunctionsSettings = ev.payload.settings;
        this.setSettings(Settings, ev.action.id);
    }

    override onTelemetrypdate = (newVal: any, oldVal: any, actionId:string) => {
        var action = this.getAction(actionId);
        var imagepath = "imgs/actions/fixingbrake/ButtonIconOFF";
        if(newVal == "true")
            imagepath = "imgs/actions/fixingbrake/ButtonIconON"
        if(!action)
            return;
        action.setImage(imagepath);
    }
}



