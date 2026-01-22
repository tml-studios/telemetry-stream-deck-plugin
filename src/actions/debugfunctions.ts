import streamDeck, { Action, action, ActionContext, DialAction, KeyAction, KeyDownEvent, KeyUpEvent, SingletonAction, WillAppearEvent, WillDisappearEvent, type DidReceiveSettingsEvent} from "@elgato/streamdeck";
import { TelemetryManager, EventModeType, MonitoringType, getTelemetrieType } from "../core/TelemetryManager";
import { TML_Event_Base, TML_SettingsBase } from "../core/TML_ActionBase";


type DebugFunction = "Vehicle" | "Player";

type DebugFunctionSettings = TML_SettingsBase & {
    ActiveDebugFunction?: DebugFunction;
};

@action({ UUID: "com.tml-edition-gmbh.the-bus-telemetry-controller.debugfunctions" })
export class DebugFunctions extends TML_Event_Base {
    

    override onWillAppear(ev: WillAppearEvent<DebugFunctionSettings>): void | Promise<void> {
        super.onWillAppear(ev);
        const settings = ev.payload.settings;
        this.setSettings(settings, ev.action.id);
        ev.action.setTitle(this.getTitle(settings.ActiveDebugFunction??"Vehicle"));
    }

    override onWillDisappear(ev: WillDisappearEvent<DebugFunctionSettings>): Promise<void> | void {
    }

    
    override async onKeyDown(ev: KeyDownEvent<DebugFunctionSettings>): Promise<void> {
        var cSettings = this.getSettings(ev.action.id);
        var url:string = "";
        switch (cSettings.ActiveDebugFunction) {
            case "Player":
                url = TelemetryManager.instance.getPlayerUrl()??"";
                break;
            case "Vehicle":
                url = TelemetryManager.instance.getCurrentVehicleUrl()??"";
                break;
            default:
                break;
        }
        if(url.length > 0)
            await streamDeck.system.openUrl(url);
        else
            ev.action.showAlert();
    }

    override onKeyUp(ev: KeyUpEvent<DebugFunctionSettings>): Promise<void> | void {

    }

    override onDidReceiveSettings(ev: DidReceiveSettingsEvent<DebugFunctionSettings>): void {

        var Settings:DebugFunctionSettings = ev.payload.settings;
        this.setSettings(Settings, ev.action.id);
        ev.action.setTitle(this.getTitle(Settings.ActiveDebugFunction??"Vehicle"));
    }

    override onTelemetrypdate = (newVal: any, oldVal: any, actionId:string) => {
    }

    private getTitle(mode: DebugFunction)
    {
        switch (mode) {
            case "Player":
                return "Show\nPlayer\nData";
            case "Vehicle":
                return "Show\nVehicle\nData";
            default:
                break;
        }
        return "none";
    }
}



