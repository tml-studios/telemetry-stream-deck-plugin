import streamDeck, { Action, action, ActionContext, DialAction, KeyAction, KeyDownEvent, KeyUpEvent, SendToPluginEvent, SingletonAction, WillAppearEvent, WillDisappearEvent, type DidReceiveSettingsEvent} from "@elgato/streamdeck";
import type {JsonObject,JsonPrimitive,JsonValue} from "@elgato/utils";
import { TelemetryManager, EventModeType, MonitoringType, getTelemetrieType } from "../core/TelemetryManager";
import { TML_Event_Base, TML_SettingsBase } from "../core/TML_ActionBase";


type DataSourcePayload = {
	event: string;
	items: DataSourceResult;
};

type DataSourceResult = DataSourceResultItem[];

type DataSourceResultItem = Item | ItemGroup;

type Item = {
	disabled?: boolean;
	label?: string;
	value: string;
};

type ItemGroup = {
	label?: string;
	children: Item[];
};

type UniversalButtonFunctionSettings = TML_SettingsBase & {
    SelectedButton?: string;
    SelectedState?: string;
};

@action({ UUID: "com.tml-edition-gmbh.the-bus-telemetry-controller.universalbuttonfunctions" })
export class UniversalButtonFunctions extends TML_Event_Base {
    
    

    override onWillAppear(ev: WillAppearEvent<UniversalButtonFunctionSettings>): void | Promise<void> {
        super.onWillAppear(ev);
        const settings = ev.payload.settings;
        this.setSettings(settings, ev.action.id);
        this.telemetryManager.on("vehicle", `buttons[${settings.SelectedButton}].State`, this.onTelemetrypdate, ev.action.id);
    }

    override onWillDisappear(ev: WillDisappearEvent<UniversalButtonFunctionSettings>): Promise<void> | void {
        var cSettings = this.getSettings(ev.action.id);
        this.telemetryManager.off("vehicle", `buttons[${cSettings.SelectedButton}].State`, ev.action.id);
    }

    
    override async onKeyDown(ev: KeyDownEvent<UniversalButtonFunctionSettings>): Promise<void> {
        var cSettings = this.getSettings(ev.action.id);
        if(cSettings.SelectedState == "cw")
        {
            this.telemetryManager.cycleButtonState(cSettings.SelectedButton);
            return;
        }
        else if(cSettings.SelectedState == "ccw")
        {
            this.telemetryManager.cycleButtonState(cSettings.SelectedButton, true);
            return;
        }
        else
        {
            this.telemetryManager.setButton(cSettings.SelectedButton, cSettings.SelectedState);
        }
    

    }

    override onKeyUp(ev: KeyUpEvent<UniversalButtonFunctionSettings>): Promise<void> | void {
    }

    override onDidReceiveSettings(ev: DidReceiveSettingsEvent<UniversalButtonFunctionSettings>): void {
        var oldSettings = this.getSettings(ev.action.id);
        this.telemetryManager.off("vehicle", `buttons[${oldSettings.SelectedButton}].State`, ev.action.id);
        var Settings:UniversalButtonFunctionSettings = ev.payload.settings;
        this.setSettings(Settings, ev.action.id);
        streamDeck.ui.sendToPropertyInspector(
                {
                    event: "getStates",
                    items: this.telemetryManager.getAvailableStateNames(Settings.SelectedButton??""),
                } satisfies DataSourcePayload
            );
        this.telemetryManager.on("vehicle", `buttons[${Settings.SelectedButton}].State`, this.onTelemetrypdate, ev.action.id);
    }

    override onTelemetrypdate = (newVal: any, oldVal: any, actionId:string) => {
        var thisAction = this.getAction(actionId);
        var cSettings = this.getSettings(actionId);
        if(!thisAction)
            return;

        thisAction.setTitle(`${cSettings.Label}\n${newVal}`)
    }

    // Fill propertiy inspector options
    override onSendToPlugin(ev: SendToPluginEvent<JsonValue, UniversalButtonFunctionSettings>): Promise<void> | void {
        if(ev.payload instanceof Object && "event" in ev.payload && ev.payload.event === "getButtons")
        {
            streamDeck.ui.sendToPropertyInspector(
                {
                    event: "getButtons",
                    items: this.telemetryManager.getAvailableButtonNames(),
                } satisfies DataSourcePayload
            );
        }

        if(ev.payload instanceof Object && "event" in ev.payload && ev.payload.event === "getStates")
        {
            var settings = this.getSettings(ev.action.id)
            streamDeck.ui.sendToPropertyInspector(
                {
                    event: "getStates",
                    items: this.telemetryManager.getAvailableStateNames(settings.SelectedButton),
                } satisfies DataSourcePayload
            );
        }

    }
}



