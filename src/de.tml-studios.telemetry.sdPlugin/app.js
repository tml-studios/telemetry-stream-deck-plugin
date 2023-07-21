/// <reference path="libs/js/action.js" />
/// <reference path="libs/js/stream-deck.js" />

const DoorAction = new Action('de.tml-studios.telemetry.dooraction');
const CashAction = new Action('de.tml-studios.telemetry.changeaction');
const GearSwitchAction = new Action('de.tml-studios.telemetry.gearselect');

var GlobalTargetAddress = null
var GlobalTargetPort = null
var LastSendCommand = null

var GlobalInterval = [];
var GlobalLampData = [];
var GlobalButtonData = [];
var GlobalCurrentState = [];
var GlobalCurrentGear = "";

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Global Functions

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
		console.log(TargetUrl)
		LastSendCommand = null
	}
}

function UpdateTelemetryData()
{
	if(GlobalTargetAddress == null || GlobalTargetPort == null)
	{
		GlobalSettings = $SD.getGlobalSettings();
	}
	else
	{
		TargetUrl = "http://" + GlobalTargetAddress + ":" + GlobalTargetPort + "/vehicles/current?vars=Buttons,AllLamps"
		fetch(TargetUrl)
		.then(data => {return data.json()})
		.then(data => {
			GlobalLampData = data.AllLamps;
			GlobalButtonData = data.Buttons;
			GlobalCurrentGear = GetCurrentGear();
		})
	}
}

$SD.onConnected(({ actionInfo, appInfo, connection, messageType, port, uuid }) => {
	console.log('Stream Deck connected!');
});


$SD.onDidReceiveGlobalSettings(({payload}) => 
{
	GlobalTargetAddress = payload.settings.TargetIp;
	GlobalTargetPort = payload.settings.TargetPort;

	if(LastSendCommand != null)
	{
		SendTelemetryAction(LastSendCommand);
	}
});

function AddInterval(Context, IntervalFunction)
{
	if(GlobalInterval["LampDataUpdate"] === undefined)
	{
		GlobalInterval["LampDataUpdate"] = setInterval( function() {UpdateTelemetryData() }, 300)
	}

	if(GlobalInterval[Context] !== undefined)
	{
		clearInterval(GlobalInterval[Context]);
	}
	GlobalInterval[Context] = setInterval(IntervalFunction, 100)
}

function RemoveInterval(Context)
{
	if(GlobalInterval[Context] !== undefined)
	{
		clearInterval(GlobalInterval[Context]);
	}
}

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Door Action Functions

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
	RemoveInterval(context);
});

$SD.onDidReceiveSettings("de.tml-studios.telemetry.dooraction", ({context, payload}) => 
{
	DoorName = payload.settings.DoorSelect
	if(DoorName === undefined) DoorName = "Front Door";

	AddInterval(context, function() {UpdateButtonLightStatus(payload.settings.DoorSelect + " Light", context)})
	
});

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

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Cash Action Functions

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


// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Gearswitch Action Functions

function GetCurrentGear()
{
	for(button in GlobalButtonData)
	{
		if(GlobalButtonData[button].Name == "Gears")
			return GlobalButtonData[button].State
	}
	return null
}


function SetGearswitchIcon(ButtonIndex, context)
{
	IconId = "R"
	ButtonState = "Reverse"
	if(ButtonIndex == 2)
	{
		IconId = "N"
		ButtonState = "Neutral"
	}
	if(ButtonIndex == 1)
	{
		IconId = "D";
		ButtonState = "Drive";
	}

	IconState = "Normal";
	if(GlobalCurrentGear == ButtonState)
		IconState = "Pushed";
	
	$SD.setImage(context, "actions/assets/Icon_" + IconId + "_" + IconState)
}

GearSwitchAction.onKeyUp(({ action, context, device, event, payload }) => {
	SendTelemetryAction("/vehicles/current/setbutton?button=Gears&state=" + payload.settings.GearSelection)
});

GearSwitchAction.onWillAppear(({ action, context, device, event, payload }) =>
{
	$SD.getSettings(context);
});

DoorAction.onWillDisappear(({ action, context, device, event, payload }) =>
{
	RemoveInterval(context);
});

$SD.onDidReceiveSettings("de.tml-studios.telemetry.gearselect", ({context, payload}) => 
{
	console.log(context);
	var ButtonGear = payload.settings.GearSelection;
	if(ButtonGear == undefined)
		ButtonGear = 2;

	AddInterval(context, function() {SetGearswitchIcon(ButtonGear, context)})
	
});




