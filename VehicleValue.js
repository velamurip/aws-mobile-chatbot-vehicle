/*
 * Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

'use strict';

/*--------------- Main handler ---------------------
 * Route the incoming request based on intent.
 *The JSON body of the request is provided in the event slot.
*/
exports.handler = (event, context, callback) => {
    try {
        // By default, treat the user request as coming from the America/New_York time zone.
        process.env.TZ = 'America/New_York';
        console.log('event.bot.name=${event.bot.name}');
        dispatch(event, (response) => callback(null, response));
    } catch (err) {
        callback(err);
    }
};

/*
* Called when the user specifies an intent for this skill.
*/
function dispatch(intentRequest, callback) {
    console.log('dispatch userId=${intentRequest.userId}, intentName=${intentRequest.currentIntent.name}');

    const intentName = intentRequest.currentIntent.name;

    // Dispatch to your skill's intent handlers
    return vehicleValue(intentRequest, callback);
}

/* ----------- Functions that control the chatbot behavior ---------------
 * This function performs dialog management and fulfillment for the chatbot
 * Note: Make sure that your Amazon Lex Chatbot slot names match the below (i.e. VehicleYear, VehicleMake, VehicleModel)
 */
function vehicleValue(intentRequest, callback) {
    //for this example, we'll explore just the first three vehicle details; year, make, and model
    const slots = intentRequest.currentIntent.slots;
    const outputSessionAttributes = intentRequest.sessionAttributes || {};
    const carYear = (slots.VehicleYear ? slots.VehicleYear : null);
    const carMake = (slots.VehicleMake ? slots.VehicleMake : null);
    const carModel = (slots.VehicleModel ? slots.VehicleModel : null);
    const source = intentRequest.invocationSource;

    if (source === 'DialogCodeHook') {
        // Perform basic validation on the supplied input slots. Use the elicitSlot dialog action to re-prompt for the first violation detected.
        const validationResult = validateVehicleData(carYear, carMake, carModel);

        // If any slots are invalid, re-elicit for their value
        if (!validationResult.isValid) {
            slots[`${validationResult.violatedSlot}`] = null;
            callback(elicitSlot(intentRequest.sessionAttributes, intentRequest.currentIntent.name, slots, validationResult.violatedSlot, validationResult.message));
            return;
        }
        callback(delegate(outputSessionAttributes, intentRequest.currentIntent.slots));
        return;
    }
	/*
	 * This is called when the Amazon Lex invocationSource = FulfillmentCodeHook
     * If the intent is configured to invoke a Lambda function as a fulfillment code hook, Amazon Lex sets the invocationSource to this value only after it has all the slot data to fulfill the intent.
     * In a real bot, this would likely involve a call to a backend service or API.
	*/
    callback(close(intentRequest.sessionAttributes, 'Fulfilled',
        { contentType: 'PlainText', content: `Your ${carYear} ${carMake} ${carModel} vehicle has been validated and ready for trade-in.` }));
}

function validateVehicleData(carYear, carMake, carModel) {

    if (carYear) {
        if (!isValidCarYear(carYear)) {
            return buildValidationResult(false, 'VehicleYear', `We do not have any vehicles in our inventory for the year ${carYear}. Please try a year newer than 1991 and not a date in the future.`);
        }
    }

    if (carMake) {
        if (!isValidCarMake(carMake)) {
            return buildValidationResult(false, 'VehicleMake', `We do not have a ${carMake} vehicle make in our inventory, can you provide a different vehicle make such as Ford, Honda, Chevrolet, or Dodge?`);
        }
    }

    if (carModel) {
        if (!isValidCarModel(carModel)) {
            return buildValidationResult(false, 'VehicleModel', `We do not have a ${carModel} vehicle model in our inventory matching a ${carYear} ${carMake}, can you provide a different vehicle model such as Explorer, Civic, Malibu, or Dakota?`);
        }
    } 

    return buildValidationResult(true, null, null);
}

//-------------Helper validation functions--------------

// Make sure the vehicle year falls within the date range of used vehicles
// Valid dates: 1992 -> CurrentYear
function isValidCarYear(carYear) {
    var isValid = false;
    if (1991 < carYear && carYear <= new Date().getFullYear()) {
        isValid = true;
    }
    return isValid;
}

function isValidCarMake(carMake) {
    const vehicleMakes = ['ford', 'honda', 'chevrolet', 'dodge'];
    console.log('[' + carMake + '] matches known vehicle makes? ' + (vehicleMakes.indexOf(carMake.toLowerCase()) > -1));
    return (vehicleMakes.indexOf(carMake.toLowerCase()) > -1);
}

function isValidCarModel(carModel) {
    const vehicleModels = ['explorer','civic', 'malibu', 'dakota'];
    console.log('[' + carModel + '] matches known vehicle model? ' + (vehicleModels.indexOf(carModel.toLowerCase()) > -1));
    return (vehicleModels.indexOf(carModel.toLowerCase()) > -1);
}

function buildValidationResult(isValid, violatedSlot, messageContent) {
    if (messageContent === null) {
        return {
            isValid,
            violatedSlot,
        };
    }
    return {
        isValid,
        violatedSlot,
        message: { contentType: 'PlainText', content: messageContent },
    };
}

// --------------- Helpers to build responses which match the structure of the necessary dialog actions -----------------------
function elicitSlot(sessionAttributes, intentName, slots, slotToElicit, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'ElicitSlot',
            intentName,
            slots,
            slotToElicit,
            message,
        },
    };
}

function confirmIntent(sessionAttributes, intentName, slots, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'ConfirmIntent',
            intentName,
            slots,
            message,
        },
    };
}

function close(sessionAttributes, fulfillmentState, message) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Close',
            fulfillmentState,
            message,
        },
    };
}

function delegate(sessionAttributes, slots) {
    return {
        sessionAttributes,
        dialogAction: {
            type: 'Delegate',
            slots,
        },
    };
}