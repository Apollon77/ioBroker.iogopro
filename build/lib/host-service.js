"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HostSyncService = void 0;
const sync_service_1 = require("./sync-service");
class HostSyncService extends sync_service_1.SyncService {
    constructor(adapter, database, uid) {
        super(adapter.log, database, uid, 'host');
        this.adapter = adapter;
        this.adapter.log.info('HostService: initializing');
        this.upload();
    }
    onObjectChange(id, obj) {
        var _a;
        if (obj == null) {
            super.deleteObject(id);
        }
        else if (obj.type === 'host') {
            const alive = ((_a = this.getLocalObject(id)) === null || _a === void 0 ? void 0 : _a.alive) || false;
            super.syncObject(id, this.getHostObject(id, obj, alive));
            this.adapter.log.info('HostService: ' + id + '  updated');
        }
    }
    onStateChange(id, state) {
        if (id.indexOf('system.host.*') === 0 && id.substr(id.lastIndexOf('.') + 1) == 'alive') {
            const objId = id.substr(0, id.lastIndexOf('.'));
            if (!this.idSet.has(objId)) {
                this.adapter.log.warn('HostService: ' + objId + '  is unknown. Nothing updated');
                return;
            }
            const obj = this.getLocalObject(objId);
            if (obj) {
                obj.alive = state.val == 'true';
                super.syncObject(objId, obj);
                this.adapter.log.debug('HostService: ' + id + '  updated (alive)');
            }
            else {
                this.adapter.log.warn('HostService: ' + objId + '  is unknown. Nothing updated');
                return;
            }
        }
    }
    upload() {
        const tmpList = new Map();
        this.adapter.getForeignObjects('*', 'host', (err, objects) => {
            this.adapter.getForeignStates('system.host.*', (err, states) => {
                var _a;
                for (const id in states) {
                    if (objects && id.endsWith('.alive')) {
                        const objId = id.substr(0, id.lastIndexOf('.'));
                        if (objects[objId] != undefined) {
                            const alive = ((_a = states[id]) === null || _a === void 0 ? void 0 : _a.val) == true;
                            const object = this.getHostObject(objId, objects[objId], alive);
                            tmpList.set(objId, object);
                        }
                    }
                }
                this.adapter.log.info('HostService: uploading ' + tmpList.size + ' hosts');
                super.syncObjectList(tmpList);
            });
        });
    }
    getHostObject(id, obj, alive) {
        return {
            id: id,
            name: obj.common.name.toString(),
            title: obj.common.title,
            installedVersion: obj.common.installedVersion || 'null',
            hostname: obj.common.hostname || 'null',
            platform: obj.native.os.platform || 'null',
            totalmem: obj.native.hardware.totalmem || 0,
            type: obj.common.type,
            alive: alive || false,
            checksum: '',
            ts: 0,
        };
    }
}
exports.HostSyncService = HostSyncService;
//# sourceMappingURL=host-service.js.map