import firebase from 'firebase/app';

export class LocationService {
    private dbRef: firebase.database.Reference;
    private deviceMap: Map<string, string[]> = new Map();

    constructor(private adapter: ioBroker.Adapter, private database: firebase.database.Database, private uid: string) {
        this.adapter = adapter;
        this.database = database;
        this.uid = uid;

        this.dbRef = this.database.ref(this.uid + '/position');
        this.adapter.log.info('LocationService: initializing');
        this._init();
    }

    private _init(): void {
        this.adapter.getDevices((err, objects) => {
            objects?.forEach((value) => {
                const deviceId = value._id.substr(value._id.lastIndexOf('.') + 1);
                this.adapter.log.debug('LocationService: initialized for device ' + deviceId);
                this.adapter.getAdapterObjects((states) => {
                    const positions: string[] = [];
                    for (const id in states) {
                        if (id.indexOf('.locations.') !== -1) {
                            positions.push(states[id]._id.substr(states[id]._id.lastIndexOf('.') + 1));
                        }
                    }
                    this.deviceMap.set(deviceId, positions);
                    this.adapter.log.debug(
                        'LocationService: initialized with deviceId ' +
                            deviceId +
                            ' and positions ' +
                            JSON.stringify(Object.values(positions)),
                    );
                });
            });
            this.adapter.log.info('LocationService: initialized with ' + objects?.length + ' devices');
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

    private saveLocation(id: string | null, data: any): void {
        if (id == null) {
            return;
        }
        const deviceId = id;
        if (!this.deviceMap.has(deviceId)) {
            for (const locationId in data) {
                const objId = deviceId + '.locations.' + locationId;
                const newVal = data[locationId];
                this.adapter.setObjectNotExists(
                    objId,
                    {
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
                    },
                    (err, obj) => {
                        if (!err && obj) {
                            this.adapter.log.info(
                                'LocationService: Objects for location (' +
                                    objId +
                                    ') created with val: ' +
                                    data[locationId],
                            );
                            this.adapter.setState(objId, { val: newVal, ack: true });
                        }
                    },
                );

                this.adapter.setState(objId, { val: newVal, ack: true });
            }
        } else {
            const tmp = this.deviceMap.get(deviceId);
            for (const locationId in data) {
                const objId = deviceId + '.locations.' + locationId;
                const newVal = data[locationId];
                if (tmp && !tmp.includes(locationId)) {
                    this.adapter.setObjectNotExists(
                        objId,
                        {
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
                        },
                        (err, obj) => {
                            if (!err && obj) {
                                this.adapter.log.info(
                                    'LocationService: Objects for location (' +
                                        objId +
                                        ') created with val: ' +
                                        data[locationId],
                                );
                                this.adapter.setState(objId, { val: newVal, ack: true });
                            }
                        },
                    );
                }

                this.adapter.setState(objId, { val: newVal, ack: true });
            }
            tmp?.filter((v) => !Object.keys(data).includes(v)).forEach((value) => {
                this.adapter.log.debug('LocationService: delete position ' + value);
                this.adapter.delObject(deviceId + '.locations.' + value);
            });
        }

        this.deviceMap.set(id, Object.keys(data));
    }

    destroy(): void {
        if (this.dbRef != undefined) {
            this.dbRef.off();
        }
    }
}
