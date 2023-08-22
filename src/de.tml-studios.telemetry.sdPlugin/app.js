/// <reference path="libs/js/action.js" />
/// <reference path="libs/js/stream-deck.js" />

const DoorAction = new Action('de.tml-studios.telemetry.dooraction');
const CashAction = new Action('de.tml-studios.telemetry.changeaction');
const GearSwitchAction = new Action('de.tml-studios.telemetry.gearselect');
const IgnitionAction = new Action("de.tml-studios.telemetry.ignition");
const FixingBrakeAction = new Action("de.tml-studios.telemetry.fixingbrake");
const CustomAction = new Action('de.tml-studios.telemetry.customaction');
const SaleStatus = new Action('de.tml-studios.telemetry.paymentstatus');
const StartOptionAction = new Action('de.tml-studios.telemetry.start');

var GlobalTargetAddress = null
var GlobalTargetPort = null
var LastSendCommand = null

var GlobalInterval = [];
var GlobalLampData = [];
var GlobalButtonData = [];
var GlobalCurrentState = [];
var GlobalPaymentStatus = null;
var GlobalCurrentGear = "";
var CurrentVehicle = null;

var SaleStatusRegister = {};
var StartOptions = {};

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Global Functions

async function fetchWithTimeout(resource, options = {}) {
	const { timeout = 8000 } = options;
	
	const controller = new AbortController();
	const id = setTimeout(() => controller.abort(), timeout);
  
	const response = await fetch(resource, {
	  ...options,
	  signal: controller.signal  
	});
	clearTimeout(id);
  
	return response;
}

async function CheckCurrentVehicle()
{

	if(GlobalTargetAddress == null || GlobalTargetPort == null)
		{
			GlobalSettings = $SD.getGlobalSettings();
			return;
		}

	var aviableVehicles = 0;
	try
	{
		TargetUrl = "http://" + GlobalTargetAddress + ":" + GlobalTargetPort + "/vehicles"
		await fetchWithTimeout(TargetUrl, {timeout: 200})
		.then(data => {return data.json()})
		.then(data => {
			aviableVehicles = data.length;
		});
	}
	catch (error)
	{
	}

	if(aviableVehicles < 1)
	{
		CurrentVehicle = null;
		return;
	}

	try
	{
		if(GlobalTargetAddress == null || GlobalTargetPort == null)
		{
			GlobalSettings = $SD.getGlobalSettings();
		}
		else
		{
			TargetUrl = "http://" + GlobalTargetAddress + ":" + GlobalTargetPort + "/vehicles/current"
			fetchWithTimeout(TargetUrl, {timeout: 200})
			.then(data => {
				if(data.text == "Not in Bus")
				{
					return null;
				}
				return data.json()
			}).then(data => {
				if(data == null)
				{
					CurrentVehicle =null;
				}
				else
				{
					CurrentVehicle = data.ActorName;
				}
			})
		}
	}
	catch (error)
	{
		console.log("Get CurrentVehicle Failed:" + error);
		ConnectionFailed();
	}
}

function SendTelemetryCommand(SendTelemetryCommand)
{
	try
	{
		if(GlobalTargetAddress == null || GlobalTargetPort == null)
		{
			GlobalSettings = $SD.getGlobalSettings();
		}
		else
		{
			TargetUrl = "http://" + GlobalTargetAddress + ":" + GlobalTargetPort + "/Command?Command=" + SendTelemetryCommand;
			fetchWithTimeout(TargetUrl, {timeout: 200});
			console.log(TargetUrl);
		}
	}
	catch (error)
	{
		console.log("Send Command Failed:" + error);
		ConnectionFailed();
	}	
}

function SendTelemetryAction(SendTelemetryCommand)
{
	try
	{
		LastSendCommand = SendTelemetryCommand
	
		if(CurrentVehicle == null)
		{
			return;
		}
	
		if(GlobalTargetAddress == null || GlobalTargetPort == null)
		{
			GlobalSettings = $SD.getGlobalSettings();
		}
		else
		{
			TargetUrl = "http://" + GlobalTargetAddress + ":" + GlobalTargetPort + "/vehicles/" + CurrentVehicle + SendTelemetryCommand
			fetchWithTimeout(TargetUrl, {timeout: 200});
			console.log(TargetUrl)
			LastSendCommand = null
		}
	}
	catch (error)
	{
		console.log("Send Action Failed:" + error);
		ConnectionFailed();
	}
}

function UpdateTelemetryData()
{
	try
	{
		if(CurrentVehicle == null)
		{
			CheckCurrentVehicle();
			return;
		}
		if(GlobalTargetAddress == null || GlobalTargetPort == null)
		{
			GlobalSettings = $SD.getGlobalSettings();
		}
		else
		{
			TargetUrl = "http://" + GlobalTargetAddress + ":" + GlobalTargetPort + "/vehicles/" + CurrentVehicle + "?vars=Buttons,AllLamps,IsPlayerControlled,BusLogic"
			fetchWithTimeout(TargetUrl, {timeout: 200})
			.then(data => {return data.json()})
			.then(data => {
				GlobalLampData = data.AllLamps;
				GlobalButtonData = data.Buttons;
				if(GlobalPaymentStatus != data.BusLogic.Sales)
				{
					GlobalPaymentStatus = data.BusLogic.Sales;
					SaleStatusChanged();
				}
				GlobalCurrentGear = GetCurrentGear();
				if(data.IsPlayerControlled == "false")
				{
					CurrentVehicle = null;
				}
			})
		}
	}
	catch (error)
	{
		console.log("Get Telemetry Data Failed:" + error);
		ConnectionFailed();
	}
}

function ConnectionFailed()
{
	CurrentVehicle = null;
	SaleStatusChanged();
	GlobalLampData.forEach(LampData => {
		LampData = 0.0;
	});
}

$SD.onConnected(({ actionInfo, appInfo, connection, messageType, port, uuid }) => {
	console.log('Stream Deck connected!');

	// Init Start Options
	StartOptions["BusName"] = "Scania_CitywideLF_18M4D";
	StartOptions["Weather"] = "Overcast";
	StartOptions["Date"] = "2023.7.4-1.0.0";
	StartOptions["SpawnInBus"] = "true";
	StartOptions["Map"] = "Berlin";
	StartOptions["OperatingPlanType"] = "Standard";
	StartOptions["OperatingPlan"] = "Standard_123";
	StartOptions["Line"] = "123";
	StartOptions["Stop"] = "Mäckeritzwiesen";
	StartOptions["Tour"] = "05";
	StartOptions["RouteIndex"] = "4";
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
		GlobalInterval["LampDataUpdate"] = setInterval( function() {UpdateTelemetryData() }, 300);
	}
	if(GlobalInterval["CurrentVehicleUpdate"] === undefined)
	{
		GlobalInterval["CurrentVehicleUpdate"] = setInterval ( function() {CheckCurrentVehicle()}, 1000);
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

function truncate(str, n)
{
	return (str.length > n) ? str.slice(0, n-2) + '...' : str;
};

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Door Action Functions

DoorAction.onKeyDown(({ action, context, device, event, payload }) => {
	SendTelemetryAction("/setbutton?button=" + payload.settings.DoorSelect + "&state=1")
});

DoorAction.onKeyUp(({ action, context, device, event, payload }) => {
	SendTelemetryAction("/setbutton?button=" + payload.settings.DoorSelect + "&state=0")
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
	SendTelemetryAction("/sendevent?event=" + payload.settings.CashChangeSelect)
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
	SendTelemetryAction("/setbutton?button=Gears&state=" + payload.settings.GearSelection)
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


// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Ignition Action Functions

IgnitionAction.onKeyUp(({ action, context, device, event, payload }) => {
		SendTelemetryAction("/sendeventrelease?event=MotorStartStop")
	});

IgnitionAction.onKeyDown(({ action, context, device, event, payload }) => {
		SendTelemetryAction("/sendeventpress?event=MotorStartStop")
	});


// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// FixingBrake Action Functions
FixingBrakeAction.onKeyDown(({ action, context, device, event, payload }) => {
	SendTelemetryAction("/sendevent?event=FixingBrake")
});

FixingBrakeAction.onWillAppear(({ action, context, device, event, payload }) =>
{
	AddInterval(context, function() {UpdateFixingBrakeStatus("LED FixingBrake", context)})
});

FixingBrakeAction.onWillDisappear(({ action, context, device, event, payload }) =>
{
	RemoveInterval(context);
});

function UpdateFixingBrakeStatus(LightName, context)
{
	if(GlobalCurrentState[context] != GlobalLampData[LightName])
	{
		GlobalCurrentState[context] = GlobalLampData[LightName]
		NewState = GlobalLampData[LightName]

		if(NewState > 0.0)
		{
			$SD.setImage(context, "actions/assets/Icon_Brake_On")
		}
		else
		{
			$SD.setImage(context, "actions/assets/Icon_Brake_Off")
		}
	}
}

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// CustomAction

CustomAction.onKeyDown(({ action, context, device, event, payload }) => {
	SendCustomAction(payload, true);
});

CustomAction.onKeyUp(({ action, context, device, event, payload }) => {
	SendCustomAction(payload, false);
});

function SendCustomAction(payload, bIsPress)
{
	var ActionType = payload.settings.TypeSelection;
	var Data = payload.settings.CustomData;

	if(ActionType == "Event")
	{
		if(bIsPress)
		{
			SendTelemetryAction("/sendeventpress?event=" + Data);
			return;
		}
		SendTelemetryAction("/sendeventrelease?event=" + Data);
		return;
	}
	if(ActionType == "Cmd" && bIsPress)
	{
		SendTelemetryCommand(Data);
	}
}

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Sale Status
SaleStatus.onWillAppear(({ action, context, device, event, payload }) =>
{
	SaleStatusRegister[context] = payload;
});

SaleStatus.onWillDisappear(({ action, context, device, event, payload }) =>
{
	SaleStatusRegister[context] = null;
});

function SaleStatusChanged()
{
	var mainImage = "actions/assets/Icon_SaleStatusIncomplete";

	if(GlobalPaymentStatus.ChangeAmountCorrect == "true")
	{
		mainImage = "actions/assets/Icon_SaleStatusComplete";
	}
	if(GlobalPaymentStatus.SaleInProgress == "false")
	{
		mainImage = "actions/assets/Icon_SaleStatus";
	}
	
	newImage = mainImage;

	Object.keys(SaleStatusRegister).forEach(SaleContext => {
		newTitle = "";
		
		curPayload = SaleStatusRegister[SaleContext];
		if(curPayload == null) 
		{
			return;
		}

		if(GlobalPaymentStatus.SaleInProgress == "true" && CurrentVehicle != null)
		{
			newImage = mainImage;
			switch(curPayload.settings.DisplayType)
			{
				case "Ticket":
					{
						newTitle = "Ticket\n" + truncate(GlobalPaymentStatus.Ticket, 10) + "\n" + truncate(GlobalPaymentStatus.Zone, 10);
						break;
					}
				case "PayMethod":
					{
						newTitle =  "Method\n" + truncate(GlobalPaymentStatus.PaymentMethodText, 10);
						break;
					}
				case "Price":
					{
						newTitle = "Price\n" + GlobalPaymentStatus.Price;
						break;
					}
				case "Paid":
					{
						var tempString = (GlobalPaymentStatus.PaymentMethod == "Cash") ? GlobalPaymentStatus.Paid : "---";
						newTitle = "Paid\n" + tempString;
						break;
					}
				case "Change":
					{
						var tempString = (GlobalPaymentStatus.PaymentMethod == "Cash") ? GlobalPaymentStatus.ChangeGiven : "---";
						newTitle = "Change\n" + tempString;
						break;
					}
				case "PayMethodIcon":
					{
						newImage = "actions/assets/Icon_PayMethod" + GlobalPaymentStatus.PaymentMethod;
						newTitle = "";
						break;
					}
				default:
					{
						newTitle = "";
						break;
					}
			}
		}

		$SD.setImage(SaleContext, newImage);

		$SD.setTitle(SaleContext, newTitle)
	});
}

$SD.onDidReceiveSettings("de.tml-studios.telemetry.paymentstatus", ({context, payload}) => 
{
	SaleStatusRegister[context] = payload;
	SaleStatusChanged();
});

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// StartOptions

StartOptionAction.onKeyDown(({ action, context, device, event, payload }) => {
	if(payload.settings.StartOption == "Start")
	{
		SendStartCommand()
		return;
	}

	StartOptions[payload.settings.StartOption] = payload.settings.CustomData;

});


function SendStartCommand()
{
	var Command = "QuickStart"
	Command += " BusName=" + StartOptions["BusName"];
	Command += " ,Weather=" + StartOptions["Weather"];
	Command += " ,Date=" + StartOptions["Date"];
	Command += " ,SpawnInBus=" + StartOptions["SpawnInBus"];
	Command += " ,Map=" + StartOptions["Map"];
	Command += " ,OperatingPlanType=" + StartOptions["OperatingPlanType"];
	Command += " ,OperatingPlan=" + StartOptions["OperatingPlan"];
	Command += " ,Line=" + StartOptions["Line"];
	Command += " ,Stop=" + StartOptions["Stop"];
	Command += " ,Tour=" + StartOptions["Tour"];
	Command += " ,RouteIndex=" + StartOptions["RouteIndex"];

	SendTelemetryCommand(Command);
}