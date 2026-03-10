import streamDeck from "@elgato/streamdeck";

import { TelemetryManager } from "./core/TelemetryManager";

import { SendEvent } from "./actions/send-event";
import { GearSwitch } from "./actions/gearswitch";
import { DebugFunctions } from "./actions/debugfunctions";
import { DoorFunctions } from "./actions/doorfunctions";
import { IndicatorFunctions } from "./actions/indicatorfunctions";
import { IgnitionFunctions } from "./actions/ignition";
import { FixingBrakeFunctions } from "./actions/fixingbarke";
import { UniversalButtonFunctions } from "./actions/universalbuttonfunctions";
import { ConnectionStateButton } from "./actions/connectionstatus";

streamDeck.logger.info("Startup");

// Init Global Settings
const telemetry = TelemetryManager.instance;
//telemetry.startPolling();

streamDeck.settings.onDidReceiveGlobalSettings((event) => {
  const settings = event.settings || {};
  updateTelemetySettings(settings);
});

function updateTelemetySettings(settings:any)
{
  telemetry.stopPolling()
  const ip = String(settings.globalTargetIP || "127.0.0.1");
  const rawPort = settings.globalTargetPort;
  const port = parseInt(String(rawPort ?? "37337"), 10);
  telemetry.setTarget(ip, port);
  telemetry.startPolling()
}

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel("trace");

// Register the increment action.
streamDeck.actions.registerAction(new ConnectionStateButton());
streamDeck.actions.registerAction(new SendEvent());
streamDeck.actions.registerAction(new GearSwitch());
streamDeck.actions.registerAction(new DebugFunctions());
streamDeck.actions.registerAction(new DoorFunctions());
streamDeck.actions.registerAction(new IndicatorFunctions());
streamDeck.actions.registerAction(new IgnitionFunctions());
streamDeck.actions.registerAction(new FixingBrakeFunctions());
streamDeck.actions.registerAction(new UniversalButtonFunctions());
 
// Finally, connect to the Stream Deck. 
streamDeck.connect();
