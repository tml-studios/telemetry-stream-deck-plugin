import streamDeck, { Action, action, ActionContext, DialAction, KeyAction, KeyDownEvent, KeyUpEvent, SendToPluginEvent, SingletonAction, WillAppearEvent, WillDisappearEvent, type DidReceiveSettingsEvent} from "@elgato/streamdeck";
import type {JsonObject,JsonPrimitive,JsonValue} from "@elgato/utils";
import { TelemetryManager, EventModeType, MonitoringType, getTelemetrieType } from "../core/TelemetryManager";
import { TML_Event_Base, TML_SettingsBase } from "../core/TML_ActionBase";


type IndicatorFunction = "InicatorLeft" | "IndicatorRight" | "WarningLights";

type IndicatorFunctionSettings = TML_SettingsBase & {
    SelectIndicatorFunction?: IndicatorFunction;
};

@action({ UUID: "com.tml-edition-gmbh.the-bus-telemetry-controller.indicatorfunctions" })
export class IndicatorFunctions extends TML_Event_Base {
    

    override onWillAppear(ev: WillAppearEvent<IndicatorFunctionSettings>): void | Promise<void> {
        super.onWillAppear(ev);
        const settings = ev.payload.settings;
        this.setSettings(settings, ev.action.id);
        this.updateImage(settings.SelectIndicatorFunction??"InicatorLeft", this.getAction(ev.action.id), false);
        TelemetryManager.instance.on("vehicle", this.getTelemetriePath(settings.SelectIndicatorFunction??"InicatorLeft"), this.onTelemetrypdate, ev.action.id);
    }

    override onWillDisappear(ev: WillDisappearEvent<IndicatorFunctionSettings>): Promise<void> | void {
        var cSettings = this.getSettings(ev.action.id);
        TelemetryManager.instance.off("vehicle", this.getTelemetriePath(cSettings.SelectIndicatorFunction??"InicatorLeft"), ev.action.id);
    }

    
    override async onKeyDown(ev: KeyDownEvent<IndicatorFunctionSettings>): Promise<void> {
        var cSettings = this.getSettings(ev.action.id);
        TelemetryManager.instance.sendEvent( this.getEvent(cSettings.SelectIndicatorFunction??"InicatorLeft"), "push");
    }

    override onKeyUp(ev: KeyUpEvent<IndicatorFunctionSettings>): Promise<void> | void {
    }

    override onDidReceiveSettings(ev: DidReceiveSettingsEvent<IndicatorFunctionSettings>): void {
        var oldSettings = this.getSettings(ev.action.id);
        TelemetryManager.instance.off("vehicle", this.getTelemetriePath(oldSettings.SelectIndicatorFunction??"InicatorLeft"), ev.action.id);
        var cSettings = ev.payload.settings;
        this.setSettings(cSettings, ev.action.id);
        this.updateImage(cSettings.SelectIndicatorFunction??"InicatorLeft", this.getAction(ev.action.id), false);
        TelemetryManager.instance.on("vehicle", this.getTelemetriePath(cSettings.SelectIndicatorFunction??"InicatorLeft"), this.onTelemetrypdate, ev.action.id);
    }

    override onTelemetrypdate = (newVal: any, oldVal: any, actionId:string) => {
        var cSettings = this.getSettings(actionId);
        var thisAction = this.getAction(actionId);
        var isActive = (newVal == "Secondary" || newVal == 1)

        this.updateImage(cSettings.SelectIndicatorFunction, thisAction, isActive);
    }

    private updateImage(ActiveFunction: IndicatorFunction, thisAction: DialAction<JsonObject> | KeyAction<JsonObject> | undefined, thisIsActive : boolean)
    {
        var imagePath = "imgs/actions/indicators/Icon_Indicator"
        switch (ActiveFunction) {
            case "InicatorLeft":    
                imagePath += "Left";
                break;

            case "IndicatorRight":
                imagePath += "Right";
                break;

            case "WarningLights":    
                imagePath = "imgs/actions/warninglights/Icon_WarningLights"
                break

            default:
                imagePath += "Left";
                break;
        }

        if(thisIsActive)
            imagePath += "On";
        else
            imagePath += "Off";

        if(!thisAction)
            return;
        thisAction.setImage(imagePath);
    }

    private getTelemetriePath(ActiveFunction: IndicatorFunction) : string
    {
        switch (ActiveFunction) {
            case "InicatorLeft":    
                return "allLamps[Light Indicator Left]";

            case "IndicatorRight":    
                return "allLamps[Light Indicator Right]";

            case "WarningLights":    
                return "allLamps[LED Warning]";

            default:
                return "allLamps[Light Indicator Left]";
        }
    }

    private getEvent(ActiveFunction: IndicatorFunction) {
        switch (ActiveFunction) {
            case "InicatorLeft":    
                return "IndicatorDown";

            case "IndicatorRight":    
                return "IndicatorUp";

            case "WarningLights":    
                return "ToggleWarningLights";

            default:
                return "IndicatorDown";
        }
    }


}



