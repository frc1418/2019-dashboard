const ipc = require('electron').ipcRenderer;

// Define UI elements
var ui = {
    timer: document.getElementById('timer'),
    robotState: document.getElementById('robot-state'),
    gyro: {
        arm: document.getElementById('gyro-arm'),
        number: document.getElementById('gyro-number')
    },
    robotDiagram: {
        body: document.getElementById('robot-diagram'),
        arm: document.getElementById('robot-arm'),
        manipulator: document.getElementById('robot-manipulator'),
        tower: document.getElementById('robot-tower'),
    },
    hatchManipulator: {
        manipulator: document.getElementById('hatch-manipulation-diagram'),
        pistonLeft: document.getElementById('hatch-piston-left'),
        pistonRight: document.getElementById('hatch-piston-right'),
    },
    tuning: {
        list: document.getElementById('tuning'),
        button: document.getElementById('tuning-button'),
        name: document.getElementById('name'),
        value: document.getElementById('value'),
        set: document.getElementById('set'),
        get: document.getElementById('get')
    },
    auto: {
        button: document.getElementById('auto-button'),
        panel: document.getElementById('auto'),
        select: document.getElementById('auto-select'),
        num: 0,
        // TODO: Warning unimplemented
        warning: document.getElementById('auto-warning'),
        position: {
            left: document.getElementById('left'),
            right: document.getElementById('right'),
            middle: document.getElementById('middle')
        },
        warn: function() {
            // TODO: Check any additional auto configurations that should be present
            if (NetworkTables.getValue('SmartDashboard/Autonomous Mode/selected') == '' || !ui.auto.field.getPosition())
                ui.autonomous.warning.display = 'block';
        }
    },
    vufine: {
        button: document.getElementById('vufine-button')
    },
    refresh: {
        button: document.getElementById('refresh')
    },
    vision: {
        readout: document.getElementById('vision-readout'),
        eye: document.getElementById('eye')
    },
    replay: {
        wrapper: document.getElementById('replay-auto'),
        name: document.getElementById('replay-name'),
        target: document.getElementById('recording-target')
    },
    camera: {
        camera1: document.getElementById('camera1'),
        camera2: document.getElementById('camera2')
    }


};

// Sets function to be called on NetworkTables connect. Commented out because it's usually not necessary.
// NetworkTables.addWsConnectionListener(onNetworkTablesConnection, true);
// Sets function to be called when robot dis/connects
NetworkTables.addRobotConnectionListener(onRobotConnection, true);
// Sets function to be called when any NetworkTables key/value changes
NetworkTables.addGlobalListener(onValueChanged, true);


function onRobotConnection(connected) {
    var state = connected ? '' : 'DISCONNECTED';
    console.log(state);
    ui.robotState.innerHTML = state;
}

function onValueChanged(key, value, isNew) {
    console.log(key, value);
    // Sometimes, NetworkTables will pass booleans as strings. This corrects for that.
    // We could also use JSON.parse() on the value if it matches either value.
    if (value == 'true') value = true;
    else if (value == 'false') value = false;

    // This switch statement chooses which UI element to update when a NetworkTables variable changes.
    switch (key) {
        case '/robot/mode':
            document.body.className = ((value === 'disabled') ? 'disabled' : 'enabled');
            switch (value) {
                case 'disabled':
                    ui.timer.innerHTML = 'DISABLED';
                    break;
                case 'teleop':
                case 'auto':
                    break;
            }
            break;
        case '/robot/time':
            ui.timer.innerHTML = value <= 0 ? '0:00' : Math.floor(value / 60) + ':' + (value % 60 < 10 ? '0' : '') + value % 60;
            ui.timer.className = value == 0 ? '' : (value <= 30 ? 'low' : (value <= 90 ? 'med' : (value <= 135 ? 'high' : 'auto')));
            break;
        case '/robot/yaw': // Gyro rotation
            ui.gyro.arm.style.transform = ('rotate(' + value + 'deg)');
            ui.gyro.number.textContent = parseInt(value) + 'º';
            break;
        case '/SmartDashboard/Autonomous Mode/options': // Load list of prewritten autonomous modes
            // Clear previous list
            while (ui.auto.select.firstChild) {
                ui.auto.select.removeChild(ui.auto.select.firstChild);
            }
            // Make an option for each autonomous mode and put it in the selector
            for (i = 0; i < value.length; i++) {
                var option = document.createElement('option');
                option.innerHTML = value[i];
                ui.auto.select.appendChild(option);
            }
            // Set value to the already-selected mode. If there is none, nothing will happen.
            ui.auto.select.value = NetworkTables.getValue('/SmartDashboard/Autonomous Mode/selected');
            break;
        case '/SmartDashboard/Autonomous Mode/selected':
            ui.auto.select.value = value;
            ui.replay.wrapper.style.display = value === 'Replay' ? 'block' : 'none';
            break;
        case '/autonomous/Replay/source':
            ui.replay.name.value = value;
            break;
        case '/components/recorder/title':
            ui.replay.target.value = value;
            break;
        case '/components/lift/lift_forward':
            ui.robotDiagram.tower.style.transform = 'translateX(' + (value ? 0 : -70) + 'px)';
            break;
        case '/components/hatch_manipulator/extended':
            // TODO: This process is unnecessarily convoluted; you should use CSS classes instead with transform: translateX properties and simply add and remove those classes to change the positioning.
            if (ui.hatchManipulator.extended == value) {
                break;
            }
            ui.hatchManipulator.extended = value;
            console.log('Hatch: ' + value);
            var pistonNum = 0;
            for (piston of ui.hatchManipulator.manipulator.children) {
                if (piston.childElementCount < 2) {
                    piston.textContent = value ? 'CLOSED' : 'OPEN';
                    continue;
                }
                for (element of piston.children) {
                    var current = parseInt(element.getAttribute('x'));
                    element.setAttribute('x', current + ((pistonNum % 2 == 0 ? -1 : 1) * (value ? -25 : 25)));
                }
                pistonNum++;
            }
            break;
        case '/vision/yaw':
            ui.vision.readout.textContent = value;
            break;
        case '/vision/target_present':
            ui.vision.eye.className.baseVal = (value ? 'on' : 'off');
            break;
    }

    // The following code manages tuning section of the interface.
    // This section displays a list of all NetworkTables variables and allows you to directly manipulate them.

    // Check if value is new and doesn't have a spot on the list yet
    if (isNew && !document.getElementsByName(key)[0]) {
        // Make a new div for this value
        var div = document.createElement('div'); // Make div
        ui.tuning.list.appendChild(div); // Add the div to the page

        var p = document.createElement('p'); // Make a <p> to display the name of the property
        p.innerHTML = key; // Make content of <p> have the name of the NetworkTables value
        div.appendChild(p); // Put <p> in div

        var input = document.createElement('input'); // Create input
        input.name = key; // Make its name property be the name of the NetworkTables value
        input.value = value; // Set
        // The following statement figures out which data type the variable is.
        // If it's a boolean, it will make the input be a checkbox. If it's a number,
        // it will make it a number chooser with up and down arrows in the box. Otherwise, it will make it a textbox.
        if (value === true || value === false) { // Is it a boolean value?
            input.type = 'checkbox';
            input.checked = value; // value property doesn't work on checkboxes, we'll need to use the checked property instead
        } else if (!isNaN(value)) { // Is the value not not a number? Great!
            input.type = 'number';
        } else { // Just use a text if there's no better manipulation method
            input.type = 'text';
        }
        // Create listener for value of input being modified
        input.onchange = function() {
            switch (input.type) { // Figure out how to pass data based on input type
                case 'checkbox':
                    // For booleans, send bool of whether or not checkbox is checked
                    NetworkTables.putValue(key, input.checked);
                    break;
                case 'number':
                    // For number values, send value of input as an int.
                    NetworkTables.putValue(key, parseInt(input.value));
                    break;
                case 'text':
                    // For normal text values, just send the value.
                    NetworkTables.putValue(key, input.value);
                    break;
            }
        };
        // Put the input into the div.
        div.appendChild(input);
    } else { // If the value is not new
        // Find already-existing input for changing this variable
        var oldInput = document.getElementsByName(key)[0];
        if (oldInput) { // If there is one (there should be, unless something is wrong)
            if (oldInput.type === 'checkbox') { // Figure out what data type it is and update it in the list
                oldInput.checked = value;
            } else {
                oldInput.value = value;
            }
        } else {
            console.log('Error: Non-new variable ' + key + ' not present in tuning list!');
        }
    }
}

ui.tuning.button.onclick = function() {
    ui.auto.panel.style.display = 'none';
    ui.tuning.list.style.display = (ui.tuning.list.style.display === 'none') ? 'block' : 'none';
};

ui.auto.button.onclick = function() {
    ui.tuning.list.style.display = 'none';
    ui.auto.panel.style.display = (ui.auto.panel.style.display === 'none') ? 'block' : 'none';
};

// Open vufine window when button is clicked
ui.vufine.button.onclick = function() {
    ipc.send('vufine');
}
ui.refresh.button.onclick = function(){
    ipc.send('refresh');
    location.reload();
}

// Manages get and set buttons at the top of the tuning pane
ui.tuning.set.onclick = function() {
    // Make sure the inputs have content, if they do update the NT value
    if (ui.tuning.name.value && ui.tuning.value.value) {
        NetworkTables.putValue(ui.tuning.name.value, ui.tuning.value.value);
    }
};
ui.tuning.get.onclick = function() {
    ui.tuning.value.value = NetworkTables.getValue(ui.tuning.name.value);
};

// Update NetworkTables when autonomous selector is changed
ui.auto.select.onchange = function() {
    NetworkTables.putValue('/SmartDashboard/Autonomous Mode/selected', this.value);

    ui.replay.wrapper.style.display = this.value === 'Replay' ? 'block' : 'none';
};

// ui.theme.select.onchange = function() {
//     NetworkTables.putValue('/SmartDashboard/theme', this.value);
// };

ui.auto.position.left.onclick = function() {
    NetworkTables.putValue('/autonomous/position', this.value);
};
ui.auto.position.right.onclick = function() {
    NetworkTables.putValue('/autonomous/position', this.value);
};
ui.auto.position.middle.onclick = function() {
    NetworkTables.putValue('/autonomous/position', this.value);
};

ui.replay.name.onchange = function() {
    NetworkTables.putValue('/autonomous/Replay/source', this.value);
}
ui.replay.target.onchange = function() {
    NetworkTables.putValue('/components/recorder/title', this.value);
};

ui.camera.camera1.onclick = function() {
    camera1.style.background = camera1.style.background;
}
ui.camera.camera2.onclick = function() {
    camera2.style.background = camera2.style.background;
}

var out = false;
ui.robotDiagram.body.onclick = function() {
    out = !out;
    console.log(out);
    console.log(ui.robotDiagram.armExtension.style.transform);
    ui.robotDiagram.armExtension.style.transform = 'translateX(' + (out ? 30 : 0)  + 'px)';
}
