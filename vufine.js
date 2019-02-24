var ui = {
    gyro: {
        arm: document.getElementById('gyro-arm'),
        number: document.getElementById('gyro-number'),
    },
}

NetworkTables.addGlobalListener(onValueChanged, true);

function onValueChanged(key, value, isNew) {
	if (value == 'true') value = true;
	else if (value == 'false') value = false;
    switch (key) {
        case '/robot/yaw':
            ui.gyro.arm.style.transform = 'rotate(' + value + 'deg)';
            ui.gyro.number.textContent = parseInt(value) + 'º';
            break;
    }
}
