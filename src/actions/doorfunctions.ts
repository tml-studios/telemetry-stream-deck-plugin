import streamDeck, { Action, action, ActionContext, DialAction, KeyAction, KeyDownEvent, KeyUpEvent, SingletonAction, WillAppearEvent, WillDisappearEvent, type DidReceiveSettingsEvent, JsonObject} from "@elgato/streamdeck";
import { TelemetryManager, EventModeType, MonitoringType, getTelemetrieType } from "../core/TelemetryManager";
import { TML_Event_Base, TML_SettingsBase } from "../core/TML_ActionBase";


type DoorFunction = "Door1" | "Door2" | "Door3" | "Door4" | "DoorClearance";

type DoorFunctionSettings = TML_SettingsBase & {
    SelectedDoorFunction?: DoorFunction;
};

@action({ UUID: "com.tml-edition-gmbh.the-bus-telemetry-controller.doorfunctions" })
export class DoorFunctions extends TML_Event_Base {
    

    override onWillAppear(ev: WillAppearEvent<DoorFunctionSettings>): void | Promise<void> {
        super.onWillAppear(ev);
        const settings = ev.payload.settings;
        this.setSettings(settings, ev.action.id);
        TelemetryManager.instance.on("vehicle", this.getTelemetriePath(settings.SelectedDoorFunction??"Door1"), this.onTelemetrypdate, ev.action.id);
    }

    override onWillDisappear(ev: WillDisappearEvent<DoorFunctionSettings>): Promise<void> | void {
        var cSettings = this.getSettings(ev.action.id);
        TelemetryManager.instance.off("vehicle", this.getTelemetriePath(cSettings.SelectedDoorFunction??"Door1"), ev.action.id);
    }

    
    override async onKeyDown(ev: KeyDownEvent<DoorFunctionSettings>): Promise<void> {
        var cSettings = this.getSettings(ev.action.id);
        TelemetryManager.instance.sendEvent( this.getEvent(cSettings.SelectedDoorFunction??"Door1"), "push");
    }

    override onKeyUp(ev: KeyUpEvent<DoorFunctionSettings>): Promise<void> | void {
    }

    override onDidReceiveSettings(ev: DidReceiveSettingsEvent<DoorFunctionSettings>): void {
        var oldSettings = this.getSettings(ev.action.id);
        TelemetryManager.instance.off("vehicle", this.getTelemetriePath(oldSettings.SelectedDoorFunction??"Door1"), ev.action.id);
        var cSettings = ev.payload.settings;
        this.setSettings(cSettings, ev.action.id);

        TelemetryManager.instance.on("vehicle", this.getTelemetriePath(cSettings.SelectedDoorFunction??"Door1"), this.onTelemetrypdate, ev.action.id);
    }

    override onTelemetrypdate = (newVal: any, oldVal: any, actionId:string) => {
        var cSettings = this.getSettings(actionId);
        var thisAction = this.getAction(actionId);
        var isActive = (newVal == "Secondary" || newVal == 1)

        this.updateImage(cSettings.SelectedDoorFunction, thisAction, isActive);
    }

    private updateImage(ActiveDoorFunction: DoorFunction, thisAction: DialAction<JsonObject> | KeyAction<JsonObject> | undefined, thisIsActive : boolean)
    {
        var imagePath = "imgs/actions/doorfunctions/Icon_Button_"
        if(ActiveDoorFunction == "DoorClearance")
            imagePath = "imgs/actions/doorfunctions/Icon_DoorClearance_"

        var imagePath = imagePath + (thisIsActive ? "On" : "Off");

        if(!thisAction)
            return;
        thisAction.setImage(imagePath);
    }

    private getTelemetriePath(ActiveDoorFunction: DoorFunction) : string
    {
        switch (ActiveDoorFunction) {
            case "Door1":    
                return "allLamps[Door Button 1]";

            case "Door2":    
                return "allLamps[Door Button 2]";

            case "Door3":    
                return "allLamps[Door Button 3]";

            case "Door4":    
                return "allLamps[Door Button 4]";

            case "DoorClearance":    
                return "buttons[Door Clearance].State";

            default:
                return "allLamps[Door Button 1]";
        }
    }

    private getEvent(ActiveDoorFunction: DoorFunction) {
        switch (ActiveDoorFunction) {
            case "Door1":   
                return "DoorFrontOpenClose";

            case "Door2":    
                return "DoorMiddleOpenClose";

            case "Door3":    
                return "DoorRearOpenClose";

            case "Door4":    
                return "DoorFourthOpenClose";

            case "DoorClearance":    
                return "ToggleDoorClearance";

            default:
                return "DoorFrontOpenClose";
        }
    }


}



