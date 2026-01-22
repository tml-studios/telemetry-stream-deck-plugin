import streamDeck, { Action, action, ActionContext, DialAction, KeyAction, KeyDownEvent, KeyUpEvent, SingletonAction, WillAppearEvent, WillDisappearEvent, type DidReceiveSettingsEvent} from "@elgato/streamdeck";
import { TelemetryManager, EventModeType, MonitoringType, getTelemetrieType } from "../core/TelemetryManager";
import { TML_Event_Base, TML_SettingsBase } from "../core/TML_ActionBase";


type SendEventSettings = TML_SettingsBase & {
	EventMode?: EventModeType;
	Event?: string;
	MonitoringMode?: MonitoringType;
	MonitoringPath?: string;
};

@action({ UUID: "com.tml-edition-gmbh.the-bus-telemetry-controller.send-event" })
export class SendEvent extends TML_Event_Base {

	override onWillAppear(ev: WillAppearEvent<SendEventSettings>): void | Promise<void> {
		super.onWillAppear(ev);
		this.settingsUpdated(ev.payload.settings, ev.action.id);
	}

	override onWillDisappear(ev: WillDisappearEvent<SendEventSettings>): Promise<void> | void {
		var cSettings = this.getSettings(ev.action.id);
		if(cSettings && cSettings.MonitoringMode && cSettings.MonitoringPath && cSettings.MonitoringMode != "OFF")
		{
			// Unsubscribe from Telemetry
			this.telemetryManager.off(getTelemetrieType(cSettings.MonitoringMode), cSettings.MonitoringPath, ev.action.id);
		}
	}

	
	override async onKeyDown(ev: KeyDownEvent<SendEventSettings>): Promise<void> {
		var cSettings = this.getSettings(ev.action.id);
		if(!cSettings || !cSettings.EventMode || !cSettings.Event)
			return;
		switch (cSettings.EventMode) {
			case "Command":
				this.telemetryManager.sendCommand(cSettings.Event??"");
				break;
			case "Event":
				this.telemetryManager.sendEvent(cSettings.Event??"", "press");
				break;
			default:
				break;
		}
	}

	override onKeyUp(ev: KeyUpEvent<SendEventSettings>): Promise<void> | void {
		var cSettings = this.getSettings(ev.action.id);
		if(!cSettings || !cSettings.EventMode || !cSettings.Event)
			return;
		switch (cSettings.EventMode) {
			case "Event":
				this.telemetryManager.sendEvent(cSettings.Event??"", "release");
				break;
			default:
				break;
		}
	}

	override onDidReceiveSettings(ev: DidReceiveSettingsEvent<SendEventSettings>): void {
		this.settingsUpdated(ev.payload.settings, ev.action.id);
	}

	override onTelemetrypdate = (newVal: any, oldVal: any, actionId:string) => {
		streamDeck.logger.debug(`[Button] Got Update from ${oldVal} to ${newVal}`);
		const foundAction = streamDeck.actions.find((action) => action.id == actionId)
		var cSettings = this.getSettings(actionId);
		if(!foundAction || !cSettings)
			return;
		if(cSettings.MonitoringMode != "OFF")
		{
			foundAction.setTitle(`${cSettings.Label ?? ""}\n${newVal}`);
		}
		else
			foundAction.setTitle(cSettings.Label ?? "");
	}

	override settingsUpdated(newSettings:SendEventSettings, actionId:string)
	{
		var cSettings = this.getSettings(actionId);
		if(cSettings && cSettings.MonitoringMode && cSettings.MonitoringPath && cSettings.MonitoringMode != "OFF")
		{
			// Unsubscribe from Telemetry
			this.telemetryManager.off(getTelemetrieType(cSettings.MonitoringMode), cSettings.MonitoringPath, actionId);
		}

		this.setSettings(newSettings, actionId);
		cSettings = newSettings;
		
		if(cSettings.MonitoringMode && cSettings.MonitoringPath && cSettings.MonitoringMode != "OFF")
		{
			// Subscribe to Telemetry
			this.telemetryManager.on(getTelemetrieType(cSettings.MonitoringMode), cSettings.MonitoringPath, this.onTelemetrypdate, actionId);
		}
		
		const foundAction = streamDeck.actions.find((action) => action.id == actionId)
		foundAction?.setTitle(newSettings.Label ?? "NONE")
	}
}




