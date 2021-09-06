"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceService = void 0;
class DeviceService {
    constructor(adapter, database, uid) {
        this.adapter = adapter;
        this.database = database;
        this.uid = uid;
        this.idSet = new Set();
        this.idAliveSet = new Set();
        this.dbDevicesRef = this.database.ref(this.uid + '/device');
        this.adapter.log.info('DeviceService: initializing');
        this._init();
    }
    _init() {
        this.adapter.getDevices((err, objects) => {
            objects === null || objects === void 0 ? void 0 : objects.forEach((value) => {
                const deviceId = value._id;
                this.idSet.add(deviceId);
                this.adapter.log.debug('DeviceService: device ' + deviceId + ' initialized');
            });
            this.adapter.log.info('DeviceService: initialized with ' + (objects === null || objects === void 0 ? void 0 : objects.length) + ' devices');
        });
        this.adapter.getStates('*', (err, states) => {
            for (const id in states) {
                if (states[id] !== null && id.endsWith('.alive')) {
                    this.calcDeviceAlive(id, states[id].val);
                }
            }
        });
        this.dbDevicesRef.on('child_added', (data) => {
            this.adapter.log.info('DeviceService: new device received with id ' + data.key);
            this.createDevice(data.key, data.val());
        });
        this.dbDevicesRef.on('child_changed', (data) => {
            this.adapter.log.debug('DeviceService: device update received for id ' + data.key);
            this.setDevice(data.key, data.val());
        });
    }
    onObjectChange(id, obj) {
        if (obj == null) {
            if (this.idSet.has(id)) {
                this.idSet.delete(id);
                this.adapter.log.debug('DeviceService: ' + id + ' deleted manually');
            }
        }
    }
    onStateChange(id, state) {
        if (id.indexOf('iogopro.') === 0 && id.endsWith('.alive')) {
            this.calcDeviceAlive(id, state.val);
            this.adapter.log.debug('DeviceService: recalc active devices');
        }
    }
    calcDeviceAlive(id, val) {
        if (val !== null && val == 'true') {
            this.idAliveSet.add(id);
        }
        else {
            this.idAliveSet.delete(id);
        }
    }
    isAnyDeviceAlive() {
        return this.idAliveSet.size > 0;
    }
    createDevice(id, data) {
        if (id == null) {
            return;
        }
        // create device
        this.adapter.setObjectNotExists(id, {
            type: 'device',
            common: {
                name: data.name,
            },
            native: {},
        });
        // create states
        this.adapter.setObjectNotExists(id + '.battery.level', {
            type: 'state',
            common: {
                name: 'battery level',
                desc: 'battery level of device ' + id,
                type: 'number',
                role: 'value.battery',
                min: 0,
                max: 100,
                unit: '%',
                read: true,
                write: false,
            },
            native: {},
        }, (err, obj) => {
            if (!err && obj) {
                this.adapter.log.debug('DeviceService: Objects for battery-level (' + id + ') created');
                this.adapter.setState(id + '.battery.level', {
                    val: data.batteryLevel,
                    ack: true,
                });
            }
            else if (err) {
                this.adapter.log.error('DeviceService: setObjectNotExists: ' + err);
            }
            else {
                this.adapter.log.debug('DeviceService: Objects (' + id + ') already exists');
            }
        });
        this.adapter.setObjectNotExists(id + '.battery.charging', {
            type: 'state',
            common: {
                name: 'battery charging',
                desc: 'battery charging of device ' + id,
                type: 'boolean',
                role: 'indicator.charging',
                read: true,
                write: false,
            },
            native: {},
        }, (err, obj) => {
            if (!err && obj) {
                this.adapter.log.debug('DeviceService: Objects for battery-charging (' + id + ') created');
                this.adapter.setState(id + '.battery.charging', {
                    val: data.batteryCharging,
                    ack: true,
                });
            }
            else if (err) {
                this.adapter.log.error('DeviceService: setObjectNotExists: ' + err);
            }
            else {
                this.adapter.log.debug('DeviceService: Objects (' + id + ') already exists');
            }
        });
        this.adapter.setObjectNotExists(id + '.alive', {
            type: 'state',
            common: {
                name: 'device status',
                desc: 'indicator if device is online ' + id,
                type: 'boolean',
                role: 'info.reachable',
                read: true,
                write: false,
            },
            native: {},
        }, (err, obj) => {
            if (!err && obj) {
                this.adapter.log.debug('DeviceService: Objects for alive (' + id + ') created');
                this.adapter.setState(id + '.alive', { val: data.alive, ack: true });
            }
            else if (err) {
                this.adapter.log.error('DeviceService: setObjectNotExists: ' + err);
            }
            else {
                this.adapter.log.debug('DeviceService: Objects (' + id + ') already exists');
            }
        });
    }
    setDevice(id, data) {
        if (id == null) {
            return;
        }
        this.adapter.extendObject(id, {
            type: 'device',
            common: {
                name: data.name,
            },
            native: {},
        });
        this.adapter.setState(id + '.battery.level', { val: data.batteryLevel, ack: true });
        this.adapter.setState(id + '.battery.charging', {
            val: data.batteryCharging,
            ack: true,
        });
        this.adapter.setState(id + '.alive', { val: data.alive, ack: true });
    }
    destroy() {
        if (this.dbDevicesRef != undefined) {
            this.dbDevicesRef.off();
        }
    }
}
exports.DeviceService = DeviceService;
//# sourceMappingURL=device-service.js.map