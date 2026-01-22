import streamDeck, { Action, action, ActionContext, DialAction, KeyAction, KeyDownEvent, KeyUpEvent, SingletonAction, WillAppearEvent, WillDisappearEvent, type DidReceiveSettingsEvent, JsonObject} from "@elgato/streamdeck";
import { TelemetryManager, EventModeType, MonitoringType, getTelemetrieType } from "../core/TelemetryManager";
import { TML_Event_Base, TML_SettingsBase } from "../core/TML_ActionBase";


type GearSwitchMode = "Drive" | "Neutral" | "Reverse";

type GearEventSettings = TML_SettingsBase & {
	GearSelectorButton?: GearSwitchMode;
	currentState?: string;
};

@action({ UUID: "com.tml-edition-gmbh.the-bus-telemetry-controller.gearswitch" })
export class GearSwitch extends TML_Event_Base {
	

	override onWillAppear(ev: WillAppearEvent<GearEventSettings>): void | Promise<void> {
		super.onWillAppear(ev);
		const settings = ev.payload.settings;
		this.setSettings(settings, ev.action.id);
		TelemetryManager.instance.on("vehicle", "buttons[Gear Selector].State", this.onTelemetrypdate, ev.action.id);
	}

	override onWillDisappear(ev: WillDisappearEvent<GearEventSettings>): Promise<void> | void {
		TelemetryManager.instance.off("vehicle", "buttons[Gear Selector].State", ev.action.id);
	}

	
	override async onKeyDown(ev: KeyDownEvent<GearEventSettings>): Promise<void> {
		var settings = this.getSettings(ev.action.id)

		switch (settings.GearSelectorButton) {
			case "Drive":
				TelemetryManager.instance.sendEvent("SetGearD", "push");
				break;
			case "Neutral":
				TelemetryManager.instance.sendEvent("SetGearN", "push");
				break;
			case "Reverse":
				TelemetryManager.instance.sendEvent("SetGearR", "push");
				break;
			default:
				break;
		}
	}

	override onKeyUp(ev: KeyUpEvent<GearEventSettings>): Promise<void> | void {

	}

	override onDidReceiveSettings(ev: DidReceiveSettingsEvent<GearEventSettings>): void {
		TelemetryManager.instance.off("vehicle", "buttons[Gear Selector].State", ev.action.id);

		var Settings:GearEventSettings = ev.payload.settings;
		this.setSettings(Settings, ev.action.id);

		TelemetryManager.instance.on("vehicle", "buttons[Gear Selector].State", this.onTelemetrypdate, ev.action.id);
	}

	override onTelemetrypdate = (newVal: any, oldVal: any, actionId:string) => {
		streamDeck.logger.debug(`[Gearswitch] Got Update from ${oldVal} to ${newVal}`);
		const thisAction = this.getAction(actionId);
		if(!thisAction)
			return;
		var settings : GearEventSettings =  this.getSettings(thisAction.id);
		var bKeyActive = newVal == settings.GearSelectorButton
		this.updateImage(settings.GearSelectorButton??"Drive", bKeyActive, thisAction)
	}


	private updateImage(mode: GearSwitchMode, state: boolean, thisAction: DialAction<JsonObject> | KeyAction<JsonObject> | undefined)
	{
		var img = "imgs/actions/gearswitch/Icon_N_Normal";
		switch (mode) {
			case "Drive":
				img = "imgs/actions/gearswitch/Icon_D_" + (state ? "Pushed" : "Normal");
				break;
			case "Neutral":
				img = "imgs/actions/gearswitch/Icon_N_" + (state ? "Pushed" : "Normal");
				break;
			case "Reverse":
				img = "imgs/actions/gearswitch/Icon_R_" + (state ? "Pushed" : "Normal");
				break;
			default:
				break;
		}

		if(thisAction == undefined)
			return;
		thisAction.setImage(img);
	}

}



