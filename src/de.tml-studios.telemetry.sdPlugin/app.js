/// <reference path="libs/js/action.js" />
/// <reference path="libs/js/stream-deck.js" />

const DoorAction = new Action('de.tml-studios.telemetry.dooraction');
const CashAction = new Action('de.tml-studios.telemetry.changeaction');

var GlobalTargetAddress = null
var GlobalTargetPort = null
var LastSendCommand = null

var GlobalInterval = [];
var GlobalLampData = [];
var GlobalCurrentState = [];

/**
 * The first event fired when Stream Deck starts
 */
function SendTelemetryAction(SendTelemetryCommand)
{
	LastSendCommand = SendTelemetryCommand

	if(GlobalTargetAddress == null || GlobalTargetPort == null)
	{
		GlobalSettings = $SD.getGlobalSettings();
	}
	else
	{
		TargetUrl = "http://" + GlobalTargetAddress + ":" + GlobalTargetPort + SendTelemetryCommand
		fetch(TargetUrl)
		LastSendCommand = null
	}
}

function UpdateLightData()
{
	if(GlobalTargetAddress == null || GlobalTargetPort == null)
	{
		GlobalSettings = $SD.getGlobalSettings();
	}
	else
	{
		TargetUrl = "http://" + GlobalTargetAddress + ":" + GlobalTargetPort + "/vehicles/current?vars=AllLamps"
		fetch(TargetUrl)
		.then(data => {return data.json()})
		.then(data => {
			GlobalLampData = data.AllLamps
		})
	}
}

function UpdateButtonLightStatus(LightName, context)
{
	if(GlobalCurrentState[context] != GlobalLampData[LightName])
	{
		GlobalCurrentState[context] = GlobalLampData[LightName]
		NewState = GlobalLampData[LightName]

		if(NewState > 0.0)
		{
			$SD.setImage(context, "actions/assets/Icon_Button_On")
		}
		else
		{
			$SD.setImage(context, "actions/assets/Icon_Button_Off")
		}
	}
}

$SD.onConnected(({ actionInfo, appInfo, connection, messageType, port, uuid }) => {
	console.log('Stream Deck connected!');
});

DoorAction.onKeyDown(({ action, context, device, event, payload }) => {
	SendTelemetryAction("/vehicles/current/setbutton?button=" + payload.settings.DoorSelect + "&state=1")
});

DoorAction.onKeyUp(({ action, context, device, event, payload }) => {
	SendTelemetryAction("/vehicles/current/setbutton?button=" + payload.settings.DoorSelect + "&state=0")
});

DoorAction.onWillAppear(({ action, context, device, event, payload }) =>
{
	$SD.getSettings(context);
});

DoorAction.onWillDisappear(({ action, context, device, event, payload }) =>
{
	if(GlobalInterval[context] !== undefined)
	{
		clearInterval(GlobalInterval[context]);
	}
});

$SD.onDidReceiveSettings("de.tml-studios.telemetry.dooraction", ({context, payload}) => 
{
	//Check LampUpdateInterval
	if(GlobalInterval["LampDataUpdate"] === undefined)
	{
		GlobalInterval["LampDataUpdate"] = setInterval( function() {UpdateLightData() }, 300)
	}

	if(GlobalInterval[context] !== undefined)
	{
		clearInterval(GlobalInterval[context]);
	}
	DoorName = payload.settings.DoorSelect
	if(DoorName === undefined) DoorName = "Front Door";
	GlobalInterval[context] = setInterval(function() {UpdateButtonLightStatus(payload.settings.DoorSelect + " Light", context)}, 100)
	
});


CashAction.onKeyUp(({ action, context, device, event, payload }) => {
	SendTelemetryAction("/vehicles/current/sendevent?event=" + payload.settings.CashChangeSelect)
});

CashAction.onWillAppear(({ action, context, device, event, payload }) =>
{
	$SD.getSettings(context);
});

$SD.onDidReceiveSettings("de.tml-studios.telemetry.changeaction", ({context, payload}) => 
{
	console.log(payload)
	var selected = payload.settings.CashChangeSelect
	

	if(payload.settings.hasOwnProperty("AutoLabel"))
	GenerateAutLabel(selected, context)
});

function GenerateAutLabel(selected, context)
	{
		var newTitle = ""

		switch(selected)
		{
			case "Coins5":
				newTitle = "0.05 €";
				break;
			case "Coins10":
				newTitle = "0.10 €";
				break;
			case "Coins15":
				newTitle = "0.15 €";
				break;
			case "Coins20":
				newTitle = "0.20 €";
				break;
			case "Coins30":
				newTitle = "0.30 €";
				break;
			case "Coins50":
				newTitle = "0.50 €";
				break;
			case "Coins60":
				newTitle = "0.60 €";
				break;
			case "Coins100":
				newTitle = "1.00 €";
				break;
			case "Coins200":
				newTitle = "2.00 €";
				break;
			case "Coins400":
				newTitle = "4.00 €";
				break;
			case "Coins600":
				newTitle = "6.00 €";
				break;
			case "Coins800":
				newTitle = "8.00 €";
				break;
			case "Take Cash Money":
				newTitle = "Grab";
				break;
		}

		$SD.setTitle(context, newTitle)
	}


$SD.onDidReceiveGlobalSettings(({payload}) => 
{
	GlobalTargetAddress = payload.settings.TargetIp;
	GlobalTargetPort = payload.settings.TargetPort;

	if(LastSendCommand != null)
	{
		SendTelemetryCommand(LastSendCommand)
	}
});