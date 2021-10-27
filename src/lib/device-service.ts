import firebase from 'firebase/app';

export class DeviceService {
    private idSet: Set<string> = new Set();
    private idAliveSet: Set<string> = new Set();
    private dbDevicesRef: firebase.database.Reference;

    constructor(private adapter: ioBroker.Adapter, private database: firebase.database.Database, private uid: string) {
        this.dbDevicesRef = this.database.ref(this.uid + '/device');
        this.adapter.log.info('DeviceService: initializing');
        this._init();
    }

    private _init(): void {
        this.adapter.getDevices((err, objects) => {
            objects?.forEach((value) => {
                const deviceId = value._id.substr(value._id.lastIndexOf('.') + 1);
                this.idSet.add(deviceId);
                this.adapter.log.debug('DeviceService: device ' + deviceId + ' initialized');
            });
            this.adapter.log.info('DeviceService: initialized with ' + objects?.length + ' devices');
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

    onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
        if (obj == null) {
            if (this.idSet.has(id)) {
                this.idSet.delete(id);
                this.adapter.log.debug('DeviceService: ' + id + ' deleted manually');
            }
        }
    }

    onStateChange(id: string, state: ioBroker.State): void {
        if (id.indexOf('iogopro.') === 0 && id.endsWith('.alive')) {
            this.calcDeviceAlive(id, state.val);
            this.adapter.log.debug('DeviceService: recalc active devices');
        }
    }

    private calcDeviceAlive(id: string, val: ioBroker.StateValue): void {
        if (val !== null && val == 'true') {
            this.idAliveSet.add(id);
        } else {
            this.idAliveSet.delete(id);
        }
    }

    isAnyDeviceAlive(): boolean {
        return this.idAliveSet.size > 0;
    }

    private createDevice(id: string | null, data: any): void {
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
        this.adapter.setObjectNotExists(
            id + '.battery.level',
            {
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
            },
            (err, obj) => {
                if (!err && obj) {
                    this.adapter.log.debug('DeviceService: Objects for battery-level (' + id + ') created');
                    this.adapter.setState(id + '.battery.level', {
                        val: data.batteryLevel,
                        ack: true,
                    });
                } else if (err) {
                    this.adapter.log.error('DeviceService: setObjectNotExists: ' + err);
                } else {
                    this.adapter.log.debug('DeviceService: Objects (' + id + ') already exists');
                }
            },
        );

        this.adapter.setObjectNotExists(
            id + '.battery.charging',
            {
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
            },
            (err, obj) => {
                if (!err && obj) {
                    this.adapter.log.debug('DeviceService: Objects for battery-charging (' + id + ') created');
                    this.adapter.setState(id + '.battery.charging', {
                        val: data.charging,
                        ack: true,
                    });
                } else if (err) {
                    this.adapter.log.error('DeviceService: setObjectNotExists: ' + err);
                } else {
                    this.adapter.log.debug('DeviceService: Objects (' + id + ') already exists');
                }
            },
        );

        this.adapter.setObjectNotExists(
            id + '.alive',
            {
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
            },
            (err, obj) => {
                if (!err && obj) {
                    this.adapter.log.debug('DeviceService: Objects for alive (' + id + ') created');
                    this.adapter.setState(id + '.alive', { val: data.alive, ack: true });
                } else if (err) {
                    this.adapter.log.error('DeviceService: setObjectNotExists: ' + err);
                } else {
                    this.adapter.log.debug('DeviceService: Objects (' + id + ') already exists');
                }
            },
        );
    }

    private setDevice(id: string | null, data: any): void {
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
            val: data.charging,
            ack: true,
        });
        this.adapter.setState(id + '.alive', { val: data.alive, ack: true });
    }

    destroy(): void {
        if (this.dbDevicesRef != undefined) {
            this.dbDevicesRef.off();
        }
    }
}
