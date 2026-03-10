import streamDeck, { Action, action, ActionContext, DialAction, KeyAction, KeyDownEvent, KeyUpEvent, SingletonAction, WillAppearEvent, WillDisappearEvent, type DidReceiveSettingsEvent} from "@elgato/streamdeck";
import { TelemetryManager, EventModeType, MonitoringType, getTelemetrieType } from "../core/TelemetryManager";
import { TML_Event_Base, TML_SettingsBase } from "../core/TML_ActionBase";



type ConnectionStateSettings = TML_SettingsBase & {
};

@action({ UUID: "com.tml-edition-gmbh.the-bus-telemetry-controller.connectionstatus" })
export class ConnectionStateButton extends TML_Event_Base {
    

    override onWillAppear(ev: WillAppearEvent<ConnectionStateSettings>): void | Promise<void> {
        super.onWillAppear(ev);
        const settings = ev.payload.settings;
        this.setSettings(settings, ev.action.id);
        TelemetryManager.instance.on("internal", "ConnectionState", this.onTelemetrypdate, ev.action.id);
    }

    override onWillDisappear(ev: WillDisappearEvent<ConnectionStateSettings>): Promise<void> | void {
        TelemetryManager.instance.off("internal", "ConnectionState", ev.action.id);
    }

    
    override async onKeyDown(ev: KeyDownEvent<ConnectionStateSettings>): Promise<void> {
    }

    override onKeyUp(ev: KeyUpEvent<ConnectionStateSettings>): Promise<void> | void {
    }

    override onDidReceiveSettings(ev: DidReceiveSettingsEvent<ConnectionStateSettings>): void {

        var Settings:ConnectionStateSettings = ev.payload.settings;
        this.setSettings(Settings, ev.action.id);
    }

    override onTelemetrypdate = (newVal: any, oldVal: any, actionId:string) => {
        var action = this.getAction(actionId);
        if(!action)
            return;
        if(newVal === "NOT_CONNECTED")
        {
            action.setImage("imgs/actions/common/BtnIcon_ConnectionFailed");
            action.setTitle("NOT CONNECTED");
            return;
        }
        if(newVal === "PLAYER_ONLY")
        {
            action.setImage("imgs/actions/common/BtnIcon_Connected");
            action.setTitle("NOT IN BUS");
            return;
        }
        if(newVal === "CONNECTED")
        {
            action.setImage("imgs/actions/common/BtnIcon_PlayerInBus");
            action.setTitle("CONNECTED");
            return;
        }
    }
}

