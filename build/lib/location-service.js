"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationService = void 0;
class LocationService {
    constructor(adapter, database, uid) {
        this.adapter = adapter;
        this.database = database;
        this.uid = uid;
        this.deviceMap = new Map();
        this.adapter = adapter;
        this.database = database;
        this.uid = uid;
        this.dbRef = this.database.ref(this.uid + '/position');
        this.adapter.log.info('LocationService: initializing');
        this._init();
    }
    _init() {
        this.adapter.getDevices((err, objects) => {
            objects === null || objects === void 0 ? void 0 : objects.forEach((value) => {
                const deviceId = value._id.substr(value._id.lastIndexOf('.') + 1);
                this.adapter.log.debug('LocationService: initialized for device ' + deviceId);
                this.adapter.getAdapterObjects((states) => {
                    const positions = [];
                    for (const id in states) {
                        if (id.indexOf('.locations.') !== -1) {
                            positions.push(states[id]._id.substr(states[id]._id.lastIndexOf('.') + 1));
                        }
                    }
                    this.deviceMap.set(deviceId, positions);
                    this.adapter.log.debug('LocationService: initialized with deviceId ' +
                        deviceId +
                        ' and positions ' +
                        JSON.stringify(Object.values(positions)));
                });
            });
            this.adapter.log.info('LocationService: initialized with ' + (objects === null || objects === void 0 ? void 0 : objects.length) + ' devices');
        });
        this.dbRef.on('child_added', (data) => {
            this.adapter.log.debug('LocationService: new location received with id ' + data.key);
            this.saveLocation(data.key, data.val());
        });
        this.dbRef.on('child_changed', (data) => {
            this.adapter.log.debug('LocationService: position update received for id ' + data.key);
            this.saveLocation(data.key, data.val());
        });
    }
    saveLocation(id, data) {
        if (id == null) {
            return;
        }
        const deviceId = id;
        if (!this.deviceMap.has(deviceId)) {
            for (const locationId in data) {
                const objId = deviceId + '.locations.' + locationId;
                const newVal = data[locationId];
                this.adapter.setObjectNotExists(objId, {
                    type: 'state',
                    common: {
                        name: 'location',
                        desc: 'is device in area',
                        type: 'boolean',
                        role: 'indicator',
                        read: true,
                        write: false,
                    },
                    native: {},
                }, (err, obj) => {
                    if (!err && obj) {
                        this.adapter.log.info('LocationService: Objects for location (' +
                            objId +
                            ') created with val: ' +
                            data[locationId]);
                        this.adapter.setState(objId, { val: newVal, ack: true });
                    }
                });
                this.adapter.setState(objId, { val: newVal, ack: true });
            }
        }
        else {
            const tmp = this.deviceMap.get(deviceId);
            for (const locationId in data) {
                const objId = deviceId + '.locations.' + locationId;
                const newVal = data[locationId];
                if (tmp && !tmp.includes(locationId)) {
                    this.adapter.setObjectNotExists(objId, {
                        type: 'state',
                        common: {
                            name: 'location',
                            desc: 'is device in area',
                            type: 'boolean',
                            role: 'indicator',
                            read: true,
                            write: false,
                        },
                        native: {},
                    }, (err, obj) => {
                        if (!err && obj) {
                            this.adapter.log.info('LocationService: Objects for location (' +
                                objId +
                                ') created with val: ' +
                                data[locationId]);
                            this.adapter.setState(objId, { val: newVal, ack: true });
                        }
                    });
                }
                this.adapter.setState(objId, { val: newVal, ack: true });
            }
            tmp === null || tmp === void 0 ? void 0 : tmp.filter((v) => !Object.keys(data).includes(v)).forEach((value) => {
                this.adapter.log.debug('LocationService: delete position ' + value);
                this.adapter.delObject(deviceId + '.locations.' + value);
            });
        }
        this.deviceMap.set(id, Object.keys(data));
    }
    destroy() {
        if (this.dbRef != undefined) {
            this.dbRef.off();
        }
    }
}
exports.LocationService = LocationService;
//# sourceMappingURL=location-service.js.map