"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateSyncService = void 0;
const sync_service_1 = require("./sync-service");
class StateSyncService extends sync_service_1.SyncService {
    constructor(adapter, database, uid, lang) {
        super(adapter.log, database, uid, 'state', lang);
        this.adapter = adapter;
        this.stateTypes = new Map();
        this.stateValues = new Map();
        this.stateObjects = new Map();
        this.adapter.log.info('StateService: initializing');
        this._initMe();
        this.upload();
    }
    _initMe() {
        this.dbStateQueuesRef = this.database.ref(this.uid + '/state/queue');
        this.dbStateQueuesRef.on('child_added', (data) => {
            var _a;
            const id = data.val().id;
            const val = data.val().value;
            this._setState(id, val);
            if (data.ref.key) {
                (_a = this.dbStateQueuesRef) === null || _a === void 0 ? void 0 : _a.child(data.ref.key).remove();
            }
            this.adapter.log.debug('StateService: new value received for state ' + id + ' value=' + JSON.stringify(data.val()));
        });
    }
    onObjectChange(id, obj) {
        if (this.idSet.has(id)) {
            if (obj == null) {
                super.deleteObject(id);
                this.stateObjects.delete(id);
            }
            else {
                const object = this.getStateObject(id, obj);
                super.syncObject(id, object);
                this.stateObjects.set(id, obj);
            }
        }
        if (obj == null || id == null) {
            return;
        }
        if (obj.type === 'enum' && (id.indexOf('enum.rooms.') === 0 || id.indexOf('enum.functions.') === 0)) {
            this.idSet.clear();
            this.stateTypes.clear();
            this.stateValues.clear();
            this.stateObjects.clear();
            this.adapter.log.info('StateService: an anum has changed, start uploading all states');
            this.upload();
        }
    }
    onStateChange(id, state) {
        var _a;
        if (this.idSet.has(id)) {
            const tmp = this.getState(state);
            if (this.stateValues.has(id) ||
                ((_a = this.stateValues.get(id)) === null || _a === void 0 ? void 0 : _a.val) !== tmp.val ||
                state.from.indexOf('system.adapter.iogo') !== -1) {
                const sobj = this.stateObjects.get(id);
                if (sobj) {
                    this.stateValues.set(id, tmp);
                    const obj = this.getStateObject(id, sobj);
                    if (obj === undefined) {
                        this.adapter.log.warn('StateService: state ' + id + ' is unknown. Nothing updated');
                        return;
                    }
                    this.adapter.log.debug('StateService: sent new value for state id ' + id);
                    super.syncValue(id, obj);
                }
            }
            else {
                this.adapter.log.debug('StateService: no update sent for state id ' + id);
            }
        }
    }
    upload() {
        this.adapter.getForeignObjects('*', 'enum', (err, enums) => {
            for (const id in enums) {
                if (id.indexOf('enum.rooms.') === 0 || id.indexOf('enum.functions.') === 0) {
                    const object = enums[id];
                    for (const key in object.common.members) {
                        this.idSet.add(object.common.members[key]);
                    }
                }
            }
            this.adapter.getForeignObjects('*', 'state', (err, objects) => {
                const tmpList = new Map();
                for (const id in objects) {
                    if (this.idSet.has(id)) {
                        this.stateTypes.set(id, objects[id].common.type);
                        this.stateObjects.set(id, objects[id]);
                    }
                }
                this.adapter.getForeignStates('*', (err, states) => {
                    for (const id in states) {
                        if (this.idSet.has(id)) {
                            if (states[id] !== undefined) {
                                const tmp = this.getState(states[id]);
                                if (typeof states[id].val !== this.stateTypes.get(id)) {
                                    this.adapter.log.warn('StateService: value of state ' + id + ' has wrong type');
                                }
                                this.stateValues.set(id, tmp);
                                tmpList.set(id, this.getStateObject(id, this.stateObjects.get(id)));
                                this.adapter.log.debug('StateService: uploading ' + id);
                            }
                        }
                    }
                    this.adapter.log.info('StateService: uploading ' + tmpList.size + ' states');
                    super.syncObjectList(tmpList);
                });
            });
        });
    }
    destroy() {
        var _a;
        (_a = this.dbStateQueuesRef) === null || _a === void 0 ? void 0 : _a.off();
    }
    _setState(id, val) {
        let newVal = val;
        if (this.stateTypes.get(id) == 'number') {
            newVal = parseFloat(val);
        }
        else if (this.stateTypes.get(id) == 'boolean') {
            newVal = val == 'true';
        }
        if (id.indexOf('iogopro.') === 1) {
            this.adapter.setState(id, newVal);
        }
        else {
            this.adapter.setForeignState(id, newVal);
        }
    }
    getStateObject(id, obj) {
        var _a, _b;
        const tmp = {};
        if (obj.common.min !== undefined && typeof obj.common.min === 'number') {
            tmp.min = parseFloat(obj.common.min.toString());
        }
        if (obj.common.max !== undefined && typeof obj.common.max === 'number') {
            tmp.max = parseFloat(obj.common.max.toString());
        }
        if (obj.common.step !== undefined && typeof obj.common.step === 'number') {
            tmp.step = parseFloat(obj.common.step.toString());
        }
        if (obj.common.states !== undefined) {
            tmp.states = this.statesStr2Obj(obj.common.states);
        }
        tmp.value = this.stateValues.get(id);
        const ret = {
            id: id,
            name: obj.common.name.toString(),
            type: obj.common.type,
            min: tmp.min || null,
            max: tmp.max || null,
            step: tmp.step || null,
            role: obj.common.role || 'text',
            unit: obj.common.unit || null,
            read: obj.common.read === true || obj.common.read === 'true',
            write: obj.common.write === true || obj.common.write === 'true',
            states: tmp.states || null,
            value: (_a = tmp.value) === null || _a === void 0 ? void 0 : _a.val,
            lc: (_b = tmp.value) === null || _b === void 0 ? void 0 : _b.lc,
            checksum: '',
            ts: 0,
        };
        return ret;
    }
    statesStr2Obj(states) {
        if (typeof states == 'string') {
            const arr = states.split(';');
            states = {};
            if (arr.length == 0) {
                return null;
            }
            for (let i = 0; i < arr.length; i++) {
                const ele = arr[i].split(':');
                states[ele[0]] = ele[1];
            }
            return states;
        }
        if (typeof states == 'object') {
            return states;
        }
        return null;
    }
    getState(state) {
        if (state != null && state.val != null) {
            state.val = state.val.toString();
        }
        else {
            state.val = 'null';
        }
        state.ts = Date.now();
        return state;
    }
}
exports.StateSyncService = StateSyncService;
//# sourceMappingURL=state-service.js.map