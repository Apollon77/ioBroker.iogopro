"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationService = void 0;
class LocationService {
    constructor(adapter, database, uid) {
        this.adapter = adapter;
        this.database = database;
        this.uid = uid;
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
                const deviceId = value._id;
                this.adapter.log.debug('LocationService: initialized for device ' + deviceId);
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
    destroy() {
        if (this.dbRef != undefined) {
            this.dbRef.off();
        }
    }
}
exports.LocationService = LocationService;
//# sourceMappingURL=location-service.js.map